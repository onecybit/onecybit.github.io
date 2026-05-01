#!/usr/bin/env bash
#
# automate_cybersecurity_kali.sh — Defensive setup script for Kali Linux
#
# Hardens a Kali Linux host: applies updates, installs common defensive tools,
# enables a host firewall and intrusion-prevention, and runs malware/rootkit
# scanners and a system auditor. Intended for the operator's own machine.
#
# Original author: Gerard King — https://www.gerardking.dev
# License:         MIT (preserved below)
# Cleaned and annotated by onecybit — https://onecybit.github.io
#
# Usage: sudo ./automate_cybersecurity_kali.sh
#
# ─── MIT License ─────────────────────────────────────────────────────────────
# Copyright (c) 2024 Gerard King
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# Every step below needs root (apt, systemctl, ufw, freshclam, etc.).
if [[ $EUID -ne 0 ]]; then
    echo "Run as root: sudo $0" >&2
    exit 1
fi

log() { printf '\n[+] %s\n' "$*"; }


# ── 1. System update ────────────────────────────────────────────────────────
# Refreshes the apt package index and applies pending security/feature
# upgrades, so every tool installed below is at its latest patched version.
update_system() {
    log "Updating package index and upgrading installed packages…"
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
}


# ── 2. Install defensive tooling ────────────────────────────────────────────
# ufw         Uncomplicated Firewall — a friendly front-end for nftables/iptables.
#             Used here to enforce a default-deny inbound policy.
#
# fail2ban    Log-watcher / IP-banner. Tails service logs (SSH, web, etc.) and
#             dynamically inserts firewall rules to block hosts that show
#             repeated failed authentication attempts.
#
# rkhunter    Rootkit Hunter — scans the filesystem for known rootkit
#             signatures, suspicious file permissions, hidden files,
#             and changes to common system binaries.
#
# chkrootkit  Independent second-opinion rootkit scanner. Pairs well with
#             rkhunter — different signature sets and detection heuristics.
#
# clamav      Open-source antivirus engine. Ships with `freshclam` (signature
#             updater) and `clamscan` (on-demand scanner).
#
# lynis       Host-hardening auditor. Walks through SSH config, kernel
#             parameters, file permissions, installed software, etc., and
#             produces a prioritised report with a numeric "hardening index".
install_security_tools() {
    log "Installing defensive tooling: ufw fail2ban rkhunter chkrootkit clamav lynis…"
    apt-get install -y ufw fail2ban rkhunter chkrootkit clamav lynis
}


# ── 3. Firewall ─────────────────────────────────────────────────────────────
# Default-deny inbound is the standard hardening posture. SSH is allowed so
# the operator does not lock themselves out of a remote box — drop the
# `ufw allow OpenSSH` line if the host is purely local.
configure_ufw() {
    log "Configuring UFW (deny in, allow out, permit SSH)…"
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow OpenSSH
    ufw --force enable
}


# ── 4. fail2ban ─────────────────────────────────────────────────────────────
# Enables the service on boot and starts it now. The default jail bans an IP
# after 5 failed SSH auth attempts for 10 minutes; tune /etc/fail2ban/jail.local
# to change thresholds or add jails for other services.
setup_fail2ban() {
    log "Enabling fail2ban service…"
    systemctl enable --now fail2ban
}


# ── 5. Rootkit Hunter ───────────────────────────────────────────────────────
# `--update` refreshes the signature database (best-effort — kept non-fatal).
# `--check --sk` runs every test and skips the interactive "press enter"
# prompts so the script can run unattended. Output: /var/log/rkhunter.log
run_rkhunter() {
    log "Running rkhunter (log: /var/log/rkhunter.log)…"
    rkhunter --update || true
    rkhunter --check --sk
}


# ── 6. ClamAV ───────────────────────────────────────────────────────────────
# `freshclam` cannot run while the clamav-freshclam daemon holds the DB lock,
# so we briefly stop it. `clamscan -r --bell -i /home` recursively scans the
# user's home directory and prints only infected files (rings the terminal
# bell on each detection).
run_clamav() {
    log "Updating ClamAV signatures…"
    systemctl stop clamav-freshclam 2>/dev/null || true
    freshclam || true
    systemctl start clamav-freshclam 2>/dev/null || true

    log "Scanning /home for malware (only infected files reported)…"
    clamscan -r --bell -i /home
}


# ── 7. Lynis audit ──────────────────────────────────────────────────────────
# Writes /var/log/lynis.log and /var/log/lynis-report.dat with concrete
# remediation suggestions and a hardening index. `--quick` skips the
# inter-test pauses.
run_lynis() {
    log "Running lynis system audit (log: /var/log/lynis.log)…"
    lynis audit system --quick
}


main() {
    log "Starting cybersecurity setup on Kali Linux…"
    update_system
    install_security_tools
    configure_ufw
    setup_fail2ban
    run_rkhunter
    run_clamav
    run_lynis
    log "Cybersecurity setup on Kali Linux completed."
}

main "$@"

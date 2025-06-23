---
title: "Nmap Usage: tips for CTF"
date: 2025-06-23 12:30:00 +0000
categories: [Pentest, Recon]
tags: [nmap, pentest, redteam, evasion]
toc: true
---

## SYN Scan with Performance and Detection Control
```bash
nmap -sS -Pn -n -T4 --max-retries 2 --host-timeout 60s 10.0.0.0/24
```
**Explanation**:
- `-sS`: TCP SYN scan (stealth scan, sends SYN, expects SYN/ACK or RST).
- `-Pn`: Skip host discovery (assume hosts are up, useful against firewalled hosts).
- `-n`: Disable DNS resolution (faster, avoids DNS noise).
- `-T4`: Aggressive timing (shorter delays, faster scan).
- `--max-retries 2`: Retries each probe max 2 times.
- `--host-timeout 60s`: Drop hosts taking too long (avoid bottlenecks).

**Packets**:
- Sends SYN packets to each target port. No full handshake.
- No reverse DNS or ICMP used.

---

## Firewall Evasion and Spoofing
```bash
nmap -sS -T1 -D 192.168.1.1,10.10.10.10,RND,RND --data-length 31 --source-port 53 10.0.0.1
```
**Explanation**:
- `-T1`: Slow scan for stealth.
- `-D`: Use decoys to obfuscate source IP.
- `--data-length 31`: Adds padding to packets (random length).
- `--source-port 53`: Set source port to 53 (DNS) to exploit weak firewall rules.

**Packets**:
- TCP SYN packets with decoy source IPs.
- Each packet is 31 bytes longer, sent slowly with fake origins.

---

## Full Port Discovery + Enumeration
```bash
nmap -p- -T4 -sS -oA tcp_fullscan <target>
nmap -sV -sC -p$(grep -oP '\d+/open' tcp_fullscan.gnmap | cut -d/ -f1 | paste -sd, -) <target>
```
**Explanation**:
- `-p-`: Scan all 65535 ports.
- `-oA`: Output in all formats (XML, grepable, text).
- `-sV`: Version detection (active banner grabs).
- `-sC`: Default NSE scripts.

**Packets**:
- SYN for discovery, followed by TCP connect or protocol-specific probes for versioning.

---

## NSE Examples: Service Analysis
```bash
nmap -p80,443 --script http-headers,http-title,http-server-header <target>
nmap -p445 --script smb-vuln-ms17-010 <target>
```
**Explanation**:
- Uses Lua scripts to interact with protocols.
- Custom headers, titles, and SMB probes.

**Packets**:
- HTTP requests for metadata.
- SMB probes for EternalBlue/MS17-010 detection.

---

## Credential Brute Forcing
```bash
nmap -p22 --script ssh-brute --script-args userdb=users.txt,passdb=passes.txt <target>
```
**Explanation**:
- Attempts SSH login with user/pass combinations.

**Packets**:
- SSH handshake + login attempts for each combo.

---

## Host Discovery with Minimal Fingerprint
```bash
nmap -sn -PE -PS21,22,80,443 -PA3389 -n --disable-arp-ping 10.0.0.0/24
```
**Explanation**:
- `-sn`: Ping-only scan (no port scan).
- `-PE`: ICMP Echo Request.
- `-PS`: TCP SYN to specific ports.
- `-PA`: TCP ACK to detect stateless filtering.
- `--disable-arp-ping`: Donât send L2 pings.

**Packets**:
- ICMP Echo, TCP SYN/ACK to simulate normal client traffic.

---

## Stack Fingerprint Obfuscation
```bash
nmap -sS --data-length 25 --ip-options "R" <target>
```
**Explanation**:
- Adds raw IP options (`R`) and alters payload length.

**Packets**:
- TCP SYN with IP header options and non-standard lengths to alter OS fingerprint profile.

---

## Scan Delta Comparison
```bash
nmap -sS -oX scan1.xml <targets>
nmap -sS -oX scan2.xml <targets>
ndiff scan1.xml scan2.xml
```
**Explanation**:
- Compare two scan outputs to find open/closed/different services.

---

## UDP Scan + Enumeration
```bash
nmap -sU -T3 -F --top-ports 100 <target>
nmap -sU -p123 --script=ntp-info <target>
```
**Explanation**:
- `-sU`: UDP scan (no handshake; relies on ICMP unreachable or response).
- `-F`: Fast mode (top 100 ports).
- `--script=ntp-info`: Extracts NTP config and system info.

**Packets**:
- Raw UDP packets sent to ports; analysis based on responses or ICMP errors.

---

## Output and Parsing
```bash
nmap -oA project --stats-every 30s -vv -p- -sS <target>
xsltproc project.xml -o report.html
```
**Explanation**:
- Real-time stats and detailed logging.
- Converts XML to HTML report.

---

## MAC Address Spoofing
```bash
nmap -sS --spoof-mac 00:11:22:33:44:55 <target>
nmap -sS --spoof-mac Apple <target>
```
**Explanation**:
- Spoofs Ethernet frame source MAC to bypass local profiling or controls.

---

## TCP Fragmentation and IDS Evasion
```bash
nmap -sS -f --mtu 24 --ttl 1337 <target>
```
**Explanation**:
- `-f`: Fragment packets to bypass simple IDS.
- `--mtu`: Force specific fragment size.
- `--ttl`: Obfuscate host distance estimation.

---
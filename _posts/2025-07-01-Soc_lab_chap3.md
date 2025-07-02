---
title: "Lab - SOC project - Chapter 3"
date: 2025-07-01 14:00:00 +0000
categories: [SOC project]
tags: [SOC, OWASP juice shop , wazuh, IncidentResponse, Threat Detection]
pin: false
toc: true
comments: true
---



Today, we gonna set up Wazuh for proper monitoring security events on our windows-endpoint. We suppose to receive information about our penetration testing windows machine. 

### Enable Windows Event Log Monitoring

By default, the Wazuh agent collects logs from key sources. 
You can customize this on the Windows machine in:

```java
C:\Program Files (x86)\ossec-agent\ossec.conf
```

Ensure you have these <localfile> entries:

```xml
<localfile>
  <location>Security</location>
  <log_format>eventchannel</log_format>
</localfile>

<localfile>
  <location>System</location>
  <log_format>eventchannel</log_format>
</localfile>

<localfile>
  <location>Application</location>
  <log_format>eventchannel</log_format>
</localfile>

<localfile>
  <location>Microsoft-Windows-PowerShell/Operational</location>
  <log_format>eventchannel</log_format>
</localfile>
```

Restart Wazuh agent (on Windows):

```powershell
net stop wazuh
net start wazuh
```

### Installing Sysmon 
Sysmon = detailed logging for process creation, registry, network connections.

Steps:
- [Download sysmon](https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon)

- Use SwiftOnSecurity's config:

```bash
https://github.com/SwiftOnSecurity/sysmon-config
```

As the author mentioned, we'll install Sysmon in the C: directory. While we don't have a system-wide setup, it's still good practice to do so.

```text
Design notes
This configuration expects software to be installed system-wide and NOT in the C:\Users folder. 
Various pieces of software install themselves in User directories, which are subject to extra monitoring. 
Where possible, you should install the system-wide version of these pieces of software, like Chrome. See the configuration file for more instructions.
```

![sysmon_loc](/assets/img/soc_lab/sysmon_localization.png)

Install:

```cmd
sysmon.exe -accepteula -i sysmonconfig.xml
```
![sysmon_config](/assets/img/soc_lab/sysmon_config.png)


In Wazuh agent config, add:

```xml
<localfile>
  <location>Microsoft-Windows-Sysmon/Operational</location>
  <log_format>eventchannel</log_format>
</localfile>
```
Restart Wazuh agent.

### Installing Suricata

To monitor Windows endpoint traffic from your Ubuntu Wazuh server, we'll install and integrate a Network IDS like Suricata on the Ubuntu server, and use port mirroring (SPAN) or a tapped interface to observe Windows traffic.

Installing Suricata (recommended over Snort for Wazuh integration), and integrating it with Wazuh.
- Fully open-source and modern IDS/IPS/NSM engine
- JSON output is easily parsed by Wazuh
- Multi-threaded (better performance)
- Native Wazuh module support

Install Suricata on Ubuntu (Wazuh Server)

1. Add Suricata PPA and install
   ```bash
   sudo add-apt-repository ppa:oisf/suricata-stable
   sudo apt update
   sudo apt install suricata -y
   ```
2. Enable eve.json logging for Wazuh
Edit /etc/suricata/suricata.yaml

Find the outputs: section and ensure eve-log is enabled:

```yaml
outputs:
  - eve-log:
      enabled: yes
      filetype: regular
      filename: /var/log/suricata/eve.json
      types:
        - alert:
            metadata: yes
            tags: yes
 ```

Here is my suricata.yaml config file: 
[Suricata](/assets/files/labs/suricata.yaml)

Your HOME_NET should be set to:

```yaml
vars:
  address-groups:
    HOME_NET: "[192.168.1.100]"
```

Interface to sniff (af-packet, pcap, or nfqueue)
Make sure Suricata knows which NIC to monitor.

For example, if your internal network uses eth0 or ens3:

```yaml
af-packet:
  - interface: eth0   # or ens3 or whatever interface connects to internal network
    cluster-id: 99
    cluster-type: cluster_flow
    defrag: yes
```
You can find your interface name via "ip a" command.

4. Using Emerging Threats Rules (Recommended)
Install and update ET rules:

```bash
sudo apt install suricata-update
sudo suricata-update
```

This will download:

```swift
/var/lib/suricata/rules/suricata.rules
```

. Test suricata
   ```bash
   sudo suricata -T -c /etc/suricata/suricata.yaml -v
   ```

![on_loc](/assets/img/soc_lab/suricata_test.png)

Once you've changed the config:

```bash
sudo systemctl restart suricata
```

### Enable Wazuh integration
Wazuh comes with a Suricata decoder and rules.

Edit Wazuh config:

```bash
sudo nano /var/ossec/etc/ossec.conf
```

Add inside <localfile> section (<ossec> tags):

```xml
<localfile>
  <log_format>json</log_format>
  <location>/var/log/suricata/eve.json</location>
</localfile>
```

Restart Wazuh manager
```bash
sudo systemctl restart wazuh-manager
```


#### Suricata rules 

A Suricata rule has the format:

```scss
action protocol src_ip src_port direction dst_ip dst_port (options)
```
Example:

```text
alert tcp any any -> any 3389 (msg:"RDP Connection Attempt"; sid:1000001; rev:1;)
```
This means:
- alert: Generate an alert
- tcp: Protocol
- any any: Source IP and Port
- ->: Direction
- any 3389: Destination IP and port (RDP)
- Inside () are rule options like:
 - msg: Message shown
 - sid: Unique rule ID
 - rev: Revision

After alerts are generated:
- Wazuh reads /var/log/suricata/eve.json
- Alerts will appear in the Wazuh dashboard
- Filter by: rule.name: "RDP Connection Attempt Detected" or data.alert.signature_id: 1000001

![on_loc](/assets/img/soc_lab/threat_hunting_d_w.png)

-----------------------------



### Summary

1. Wazuh
Central SIEM-like platform for logs & alerting
-Installed on Ubuntu
Collects logs from:
-Windows Agent
- Suricata IDS (eve.json)
- Sysmon (via Windows agent)

2. Sysmon (on Windows)
Logs detailed system events:
- Process creation
- File drops
- Registry changes
- Network connections

Events collected by Wazuh Agent → sent to Wazuh Server

3. Suricata (on Ubuntu)
Network-based Intrusion Detection System (NIDS)
Monitors network traffic to/from Windows
Detects:
- Nmap scans
- Exploits
- Malware traffic (C2, etc.)

Writes to eve.json → Wazuh parses alerts

---------------------------------------

### What we can monitor

| Threat Category   | Detection Source         | Example                           |
|-------------------|--------------------------|---------------------------------|
| Brute-force       | Sysmon + Wazuh rules     | 4625 login failures             |
| Malware dropper   | Sysmon (proc/file create)| powershell.exe downloading files|
| Reconnaissance    | Suricata                 | Nmap, port scans                |
| Lateral movement  | Suricata + Sysmon        | SMB, PsExec, RDP                |
| Data exfiltration | Suricata                 | Large DNS, HTTP uploads         |
| Persistence       | Sysmon                   | Registry Run keys, scheduled tasks |
| Tampering         | Sysmon + Wazuh           | Security log cleared (1102)     |


---------------------------------------------------

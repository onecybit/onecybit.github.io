---
title: "Lab - SOC project - Chapter 1"
date: 2025-06-26 14:00:00 +0000
categories: [SOC project]
tags: [SOC, pentest, logs, wazuh, IncidentResponse, Threat Detection]
pin: false
toc: true
comments: true
---

## 🗂️ Project Overview

| Component | Goal |
|-------------------|----------|
|  Endpoint VMs   | Generate and send logs   | 
|  SIEM Server	  | Collect, analyze, and alert on logs   |
|  IDS/IPS	  | Monitor network traffics   |
|  Visualization	  | Use dashboards to analyze activity   |
| Attacker Box	  |Launch simulated attacks for testing   |

---

## Phase 1: Lab Setup

### Step 1
1) Install Virtualization Software
   Download VirtualBox or VMware Workstation 
2) Enable Intel VT-x / AMD-V in BIOS for virtualization


### Step 2: Download OS ISOs

#### Ubuntu Server 22.04 (SIEM server)
[https://ubuntu.com/download/server#architectures](https://ubuntu.com/download/server/thank-you?version=22.04.5&architecture=amd64&lts=true)

It's recommended to have around 45G space, to run server and Wazuh (with logs). 


#### Installing Wazuh on the server
First, we need to update
```bash
sudo apt update
sudo apt full-upgrade -y
```

```bash
curl -sO https://packages.wazuh.com/4.12/wazuh-install.sh && sudo bash ./wazuh-install.sh -a
```
After succssefull installation, we will get our creds to dashboard login. 

![Wazuh_install](/assets/img/soc_lab/succssefull_install_wazuh.png)


#### Kali linux
- Kali Linux (offensive machine) [https://www.kali.org/get-kali/#kali-platforms](https://www.kali.org/get-kali/#kali-platforms)

```bash
sudo apt update        # Fetches the list of available updates
sudo apt full-upgrade  # Installs updates; may also remove some packages,
```


#### Windows 10 (endpt)
- Windows 10 (target endpoint)
Installing Wazuh Agent on Windows
https://documentation.wazuh.com/current/installation-guide/wazuh-agent/wazuh-agent-package-windows.html



### Step 3: Internal Network Setup
Set all VMs to "Host-only" or "Internal Network"
Assign static IPs or use DHCP with fixed leases

Create an "Internal Network"

I'll do it using virt-manager GUI, because i have QEMU/KVM VirtManager.

1) Open virt-manager
2) Go to Edit → Connection Details → Virtual Networks
3) Click + (Add network)

Set:
- Name: internal-net
- Mode: Isolated network (no NAT or DHCP unless you want to add DHCP manually)
- Leave DHCP unchecked (for static IP)
- Finish & apply

Next, attach VM to the Internal Network:
Using virt-manager:
1) Open your VM → Details
2) Go to NIC (Network Interface)

Select:
- Network source: internal-net
- Device model: virtio (recommended) (don't work for WIN10, choose another one)
![Internal-net](/assets/img/soc_lab/internal-net_qemu_kvm.png)



#### Assign Static IP in Ubuntu Server (Guest VM)
Edit the Netplan config:

```bash
sudo nano /etc/netplan/50-cloud-init.yaml
```

```bash
network:
  version: 2
  ethernets:
    enp1s0:
      dhcp4: no
      addresses:
        - 192.168.100.10/24
      gateway4: 192.168.100.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```
![netplan](/assets/img/soc_lab/nano_netplan_config.png)

Apply:
```bash
sudo netplan apply
```
Test:
```bash
ip a
ping 192.168.100.1
```



#### Assign to Win10
Open Network Settings
- Press Windows Key + R, type ncpa.cpl, hit Enter.
- Right-click your network adapter (usually called Ethernet, or Ethernet 2).
- Click Properties.

Next, set Static IP
- Scroll and select Internet Protocol Version 4 (TCP/IPv4).
- Click Properties.
- Select:
* Use the following IP address:

Fill in the fields:

Field	Value
IP address	192.168.100.20
Subnet mask	255.255.255.0
Default gateway	192.168.100.1
Preferred DNS	8.8.8.8
Alternate DNS	1.1.1.1

Click OK, then Close.
![Win_network](/assets/img/soc_lab/setting_win.png)

Confirm Static IP Is Active
Open Command Prompt:

```bash
ipconfig
```
You should see:
```bash
IPv4 Address. . . . . . . . . . . : 192.168.100.20
Subnet Mask . . . . . . . . . . . : 255.255.255.0
Default Gateway . . . . . . . . . : 192.168.100.1
```
Test connectivity:
```bash
ping 192.168.100.10   # (Wazuh server)
```
![Win_verfication](/assets/img/soc_lab/win_10networking_verification.png)



#### Wazuh agent

We need to register this agent to Wazuh server (soc server)

Open Terminal on your Wazuh server (SOC-Server):

```bash
sudo /var/ossec/bin/manage_agents
```
You’ll see a menu like:

```bash
Wazuh v4.X Agent Manager
Choose your action:
   (A)dd an agent (A).
   (E)xtract key for an agent (E).
   (L)ist already added agents (L).
   (R)emove an agent (R).
   (Q)uit.
```
➕ Add Agent
Press A and hit Enter

Fill in:
Agent name → Win10-Endpt
Agent IP → 192.168.100.20 (or leave blank if not used)
Press Enter to finish

![Wazuh_agent](/assets/img/soc_lab/wazuh_agent.png)



#### Kali set up 

Add new connection 
![Kali_network](/assets/img/soc_lab/kali_con.png)
Check with ping command. 

-----------------------------------------
Okay, all set.



#### Wazuh dashboard

On your's host machine open https://192.168.100.10/ 
And we should see one active agent connected - win10 endpoint
![Wazuh_dash](/assets/img/soc_lab/Wazuh_dashboard.png)


Now, we'll try to perform nmap scan on Win10. 

![Scan_perform](/assets/img/soc_lab/scan_perform.png)



Lab graph:
```markdown
                        +-----------------------------+
                        |      Internal Network       |
                        |        (SOC-Net)            |
                        +-------------+---------------+
                                      |
          +---------------------------+---------------------------+
          |                           |                           |
+--------------------+     +----------------------+     +-----------------------+
|   SOC-Server       |     |   Win10-Endpoint     |     |     Kali-Lab          |
|  Ubuntu 22.04      |     |   Windows 10         |     |   Kali Linux          |
|  IP: 192.168.100.10|     |   IP: 192.168.100.20 |     |   IP: 192.168.100.30  |
|  Wazuh SIEM        |     |   OSSEC Agent        |     |   Adversary Simulator |
+--------+-----------+     +----------+-----------+     +-----------+-----------+
         |                          |                             |
         +-------------+------------+-------------+---------------+
                       | Log Data & Events Sent To SOC-Server
                       |
                       |
+-------------------------------------------------------------+
|        Web Dashboard  on SOC-Server                         |
|     URL: http://192.168.100.10:5601                         |
|     Credentials: admin / (default)                          |
+-------------------------------------------------------------+
```
Next, we’ll simulate attacks using Kali to test detection capabilities.
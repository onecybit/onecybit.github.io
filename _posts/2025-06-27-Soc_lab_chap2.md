---
title: "Lab - SOC project - Chapter 2"
date: 2025-06-27 14:00:00 +0000
categories: [SOC project]
tags: [SOC, OWASP juice shop , wazuh, IncidentResponse, Threat Detection]
pin: false
toc: true
comments: true
---

## Chapter 2

With our base lab environment now configured and all machines networked internally, it's time to move forward.
In Phase 2, we'll begin adding vulnerable applications to our Windows 10 endpoint to simulate real-world attack scenarios.

---
### First: Install OWASP Juice Shop
We’ll start by installing OWASP Juice Shop, a modern web app designed for security training, featuring dozens of known vulnerabilities including:
- SQL Injection
- Cross-Site Scripting (XSS)
- Insecure Authentication
- Broken Access Control
- …and more

I will chose option - packaged distributions. 

[Juice Shop](https://github.com/juice-shop/juice-shop)

Packaged Distributions - GitHub release 

1) Install a 64bit node.js on your Windows, MacOS or Linux machine
2) Download juice-shop-<version>_<node-version>_<os>_x64.zip (or .tgz) attached to latest release
3) Unpack and cd into the unpacked folder
4) Run npm start
5) Browse to http://localhost:3000
Each packaged distribution includes some binaries for sqlite3 and libxmljs2 bound to the OS and node.js version which npm install was executed on.

![Juice_shop](/assets/img/soc_lab/juice_shop.png)

### Next, bind Juice Shop to Your IP Address

Use HTTP_PORT and HTTP_ADDRESS Environment Variables

First, open Command Prompt or PowerShell
Navigate to the folder where Juice Shop is unpacked
Run the following (replace IP with your Windows IP):

```bash
set HTTP_PORT=3000
set HTTP_ADDRESS=192.168.100.20
npm start
```
Or
```powershell
$env:HTTP_PORT="3000"
$env:HTTP_ADDRESS="192.168.100.20"
npm start
```

This binds Juice Shop to your actual network interface instead of localhost.

![Ipch](/assets/img/soc_lab/ip_change_juice.png)

----------------------------------

Use Nmap from Kali to verify if the target application is accessible:
```bash
nmap -A -p- 192.168.100.20
```
![jk](/assets/img/soc_lab/juice_from_k.png)

All set, great!

In the next article we would set up SIEM (Wazuh) to detect threats, analyze behaviors, and trigger alert. 

---
title: IPTables HowTos
date: 2018-04-11 15:46:04
tags:
  - linux
  - iptables
toc: true
reward: true
---

This article describes basic usage of linux iptables.

## Sources

1. [CentOS HowTos][1]
1. [DigitalOcean iptables][2]

## List Rules

```bash
sudo iptables --list -n --line-numbers

# --list: or -L, list rules
# -n: use port number instead of protocol name
# --line-numbers: add ID numbers to the rules for further operations, e.g. deleting

# A sample output (172.20.20.207, as of 20171221):

Chain INPUT (policy DROP)
num  target     prot opt source               destination
1    ACCEPT     all  --  0.0.0.0/0            0.0.0.0/0
2    ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:22
3    ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:21
4    ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:80
5    ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:443
6    ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:3030
7    ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:6379
8    ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:8080
9    ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:3000
10   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:3001
11   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:8090
12   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:8091
13   ACCEPT     icmp --  0.0.0.0/0            0.0.0.0/0            icmptype 8
14   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:5672
15   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:15672
16   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:6677
17   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:6682
18   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:6680
19   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:5678
20   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:5001
21   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:6683
22   ACCEPT     all  --  0.0.0.0/0            0.0.0.0/0            state RELATED,ESTABLISHED
23   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:4242
24   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:5005
25   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:5006
26   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:5000
27   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:3307
28   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:3308
29   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:15672
30   ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:5672

Chain FORWARD (policy DROP)
num  target     prot opt source               destination

Chain OUTPUT (policy ACCEPT)
num  target     prot opt source               destination
```

To show packet counts and aggregate size in the INPUT chain:

```bash
sudo iptables -L INPUT -v
```

## Delete Rules

```bash
# delete a single rule in the INPUT chain
sudo iptables -D INPUT 3

# flush all rules in the INPUT chain
sudo iptables -F INPUT

# flush all chains
sudo iptables -F
```

## Chains

- INPUT - All packets destined for the host computer.
- OUTPUT - All packets originating from the host computer.
- FORWARD - All packets neither destined for nor originating from the host computer, but passing through (routed by) the host computer. This chain is used if you are using your computer as a router.

## Default Policy

- DROP: if no ACCEPT rules are set, drop all packages
- ACCEPT: if no DROP rules are set, accept all packages

## CLI Walktrhough

```bash
iptables -P INPUT ACCEPT
iptables -F
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT
```

Explanation:

1. **iptables -P INPUT ACCEPT** If connecting remotely we must first temporarily set the default policy on the INPUT chain to ACCEPT otherwise once we flush the current rules we will be locked out of our server.
1. **iptables -F** We used the -F switch to flush all existing rules so we start with a clean state from which to add new rules.
1. **iptables -A INPUT -i lo -j ACCEPT** Now it's time to start adding some rules. We use the -A switch to append (or add) a rule to a specific chain, the INPUT chain in this instance. Then we use the -i switch (for interface) to specify packets matching or destined for the lo (localhost, 127.0.0.1) interface and finally -j (jump) to the target action for packets matching the rule - in this case ACCEPT. So this rule will allow all incoming packets destined for the localhost interface to be accepted. This is generally required as many software applications expect to be able to communicate with the localhost adaptor.
1. **iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT** This is the rule that does most of the work, and again we are adding (-A) it to the INPUT chain. Here we're using the -m switch to load a module (state). The state module is able to examine the state of a packet and determine if it is NEW, ESTABLISHED or RELATED. NEW refers to incoming packets that are new incoming connections that weren't initiated by the host system. ESTABLISHED and RELATED refers to incoming packets that are part of an already established connection or related to and already established connection.
1. **iptables -A INPUT -p tcp --dport 22 -j ACCEPT** Here we add a rule allowing SSH connections over tcp port 22. This is to prevent accidental lockouts when working on remote systems over an SSH connection. We will explain this rule in more detail later.
1. **iptables -P INPUT DROP** The -P switch sets the default policy on the specified chain. So now we can set the default policy on the INPUT chain to DROP. This means that if an incoming packet does not match one of the following rules it will be dropped. If we were connecting remotely via SSH and had not added the rule above, we would have just locked ourself out of the system at this point.
1. **iptables -P FORWARD DROP** Similarly, here we've set the default policy on the FORWARD chain to DROP as we're not using our computer as a router so there should not be any packets passing through our computer.
1. **iptables -P OUTPUT ACCEPT** and finally, we've set the default policy on the OUTPUT chain to ACCEPT as we want to allow all outgoing traffic (as we trust our users).
1. **iptables -L -v** Finally, we can list (-L) the rules we've just added to check they've been loaded correctly.

Finally:

```bash
sudo /sbin/service iptables save
```

## Executable script

Open a text editor:

```bash
#!/bin/bash
#
# iptables example configuration script
#
# Flush all current rules from iptables
#
iptables -F
#
# Allow SSH connections on tcp port 22
# This is essential when working on remote servers via SSH to prevent locking yourself out of the system
#
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
#
# Set default policies for INPUT, FORWARD and OUTPUT chains
#
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT
#
# Set access for localhost
#
iptables -A INPUT -i lo -j ACCEPT
#
# Accept packets belonging to established and related connections
#
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
#
# Save settings
#
/sbin/service iptables save
#
# List rules
#
iptables -L -v
```

Save the script then make it executable:

```bash
chmod +x myfirewall
```

<!-- reference links -->
[1]: <https://wiki.centos.org/HowTos/Network/IPTables>
[2]: <https://www.digitalocean.com/community/tutorials/how-to-list-and-delete-iptables-firewall-rules>

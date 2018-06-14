---
title: JKOM CentOS VM Setup
date: 2018-04-11 15:45:54
tags:
  - centos
  - sysadmin
  - jkom
toc: true
reward: true
---

This article describes the steps of initiating a CentOS VM normally used with JKOM's private network.

Here are the technical requirements:

- create user `jk` with root privilage
- disable `root` login from remote
- disable firewall as it's in local network
- dev-tools such as git
- python 3.6
- node 8.9.3

<!-- more -->

## Basics

```bash
ssh root@server_ip_address
```

### Fix locale warning

```bash
sudo vim /etc/environment

# add these lines...

LANG=en_US.utf-8
LC_ALL=en_US.utf-8
```

re-login

### Package update

```bash
yum update
```

### Disable firewall

```bash
systemctl stop firewalld.service
systemctl disable firewalld.service
```

### add user:jk with sudo permission

```bash
adduser jk
passwd jk
usermod -aG wheel jk
```

### disable root login

```bash
sudo yum install vim
sudo vim /etc/ssh/sshd_config

PermitRootLogin no
PubkeyAuthentication yes

sudo service sshd restart
```

re-login with `ssh jk@server_ip_address`

### PubKey login

```bash
ssh-keygen -t rsa
cd
vim .ssh/authorized_keys
chmod 600 .ssh/authorized_keys

```

### Install oh-my-zsh

```bash
sudo yum install zsh
sudo yum install git
sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
```

## Code Env

### Python3

```bash
sudo yum -y update
sudo yum -y install yum-utils
sudo yum -y groupinstall development
sudo yum -y install https://centos7.iuscommunity.org/ius-release.rpm
sudo yum -y install python36u
sudo yum -y install python36u-pip
sudo yum -y install python36u-devel

cd
mkdir .pip
vim .pip/pip.conf

# add the following config
[global]
index-url = https://mirrors.ustc.edu.cn/pypi/web/simple
format = columns
```

### Nodejs

```bash
cd
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash

# re-login

nvm install 8.9.3
npm install -g cnpm --registry=https://registry.npm.taobao.org
cnpm install -g pm2
sudo env PATH=$PATH:/home/jk/.nvm/versions/node/v8.9.3/bin /home/jk/.nvm/versions/node/v8.9.3/lib/node_modules/pm2/bin/pm2 startup systemd -u jk --hp /home/jk
```

### ODBC Driver

[reference](https://github.com/mkleehammer/pyodbc/wiki/Connecting-to-SQL-Server-from-RHEL-6-or-Centos-7)

```bash
sudo su
curl https://packages.microsoft.com/config/rhel/6/prod.repo > /etc/yum.repos.d/mssql-release.repo
exit
sudo yum remove unixODBC-utf16 unixODBC-utf16-devel
sudo ACCEPT_EULA=Y yum install msodbcsql
sudo yum install unixODBC-devel  # required by pyodbc
```

### ZeroMQ

```bash
sudo yum -y install zeromq
sudo yum -y install zeromq-devel  # required by zerorpc
```

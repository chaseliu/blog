---
title: CentOS7中安装MongoDB
date: 2018-04-16 15:04:13
tags:
  - linux
  - mongodb
toc: true
reward: true
---

本文概述了自己在CentOS7操作系统的服务器上安装配置MongoDB的一些基本步骤，供读者参考。

## 删除旧版本

如果系统中已经装有旧版本，请重点关注以下步骤。如果没有旧版本可以直接跳过本章节。

### 配置文件备份

一般当前的配置文件会存放在 `/etc/mongod.conf` 中。通过查阅该文件也可以定位数据文件和日志文件的存放位置。

### 数据文件备份，备份，备份！（重要的事情说三遍）

建议使用`mongodumps -o some_dir`命令来备份。由于导出的是`bson`文件，相比较`mongoexport`效率更高。

### 删除旧版本

```bash
yum remove mongodb-org
yum autoremove
```

## 安装

这里通过官方安装源安装，虽然速度慢，但步骤非常简洁。

创建 `/etc/yum.repos.d/mongodb-org-3.6.repo` 文件，添加一下内容：

```ini
[mongodb-org-3.6]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/3.6/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-3.6.asc
```

随后运行安装命令

```bash
yum install -y mongodb-org
```

## 关闭SELinux

之前在Azure的Ubuntu的服务器上好像没有遇到过这个问题。公司里的CentOS7镜像默认是 `enforcing` 模式。

简单带各位回顾一下今早踩过的一个坑：

同事之前帮忙部署了一台mongodb实例，数据文件是从之前一台已经弃用的服务器上scp拷贝过来的。我今天计划想把这台实例加固一下，首先就升级了系统然后reboot。没想到重启之后，mongodb的实例就没有自动启动起来。尝试使用 `systemctl start mongod` 就报错。追查到 `/var/log/mongodb/mongod.log` 中，就发现是访问磁盘路径时报了权限错误。这我就纳闷了，我只是重启了一下机器，怎么正常的启动脚本就失效了呢？

- 尝试直接在root账户下运行 `mongod`，没问题
- 检查数据文件路径，文件所有者和访问模式都没毛病
- 卸载mongodb程序，删除所有配置，重新安装，还是不行
- 删除数据文件，使用root账户运行 `mongod` 初始化数据文件，然后再 `chown -R mongod:mongod /data/db` 改文件所有者，还是不行

很郁闷问题到底出在哪里了，也没有任何报错信息提示是 SELinux 造成。询问同事之前怎么安装的了，回答我说时间太久忘记了。。

嗯之后网上搜索询问抓狂的细节我也不多说了。直奔结果，最终还是在 `StackOverflow` 上的一篇**未被采纳**的回答里找到了答案[原文地址](https://stackoverflow.com/questions/5973811/mongodb-data-directory-permissions)。恍然大悟一定是同事之前部署的时候没有在 `/etc/selinux/config` 中持久化配置。虽然我也不理解SELinux到底是怎么回事，简单起见这里建议关闭。在配置中修改：

```ini
SELINUX=disabled
```

修改完之后记得重启机器生效。重启后可以通过 `getenforce` 命令查看当前生效的模式。

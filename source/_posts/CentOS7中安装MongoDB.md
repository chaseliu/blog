---
title: CentOS7中安装MongoDB
date: 2018-04-16 15:04:13
tags:
  - database
  - sysadmin
  - mongodb
toc: true
reward: true
---

本文概述了自己在CentOS7操作系统的服务器上安装配置MongoDB的一些基本步骤，供读者参考。

## 删除旧版本

如果系统中已经装有旧版本，请重点关注以下步骤。如果没有旧版本可以直接跳过本章节。

### Step 1: 配置文件备份

一般当前的配置文件会存放在 `/etc/mongod.conf` 中。通过查阅该文件也可以定位数据文件和日志文件的存放位置。

### Step 2: 数据文件备份

备份，备份，备份！（重要的事情说三遍）。建议使用`mongodumps -o some_dir`命令来备份。由于导出的是`bson`文件，相比较`mongoexport`效率更高。

### Step 3: 删除旧版本

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

<!-- more -->

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

## 修改数据存储位置

mongodb的默认存储位置是 `/var/lib/mongo`。通常这个路径的挂载位置是系统盘，数据盘我通常会挂在至 `/data` 目录。在 `/etc/mongod.conf` 中修改数据存储的路径。修改 `storage` 配置：

```yaml
storage:
  journal:
    enabled: true
  dbpath: /data/db
```

## 禁用THP

> 原文地址：https://docs.mongodb.com/manual/tutorial/transparent-huge-pages/

创建启动项： `/etc/init.d/disable-transparent-hugepages`

```bash
#!/bin/bash
### BEGIN INIT INFO
# Provides:          disable-transparent-hugepages
# Required-Start:    $local_fs
# Required-Stop:
# X-Start-Before:    mongod mongodb-mms-automation-agent
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Disable Linux transparent huge pages
# Description:       Disable Linux transparent huge pages, to improve
#                    database performance.
### END INIT INFO

case $1 in
  start)
    if [ -d /sys/kernel/mm/transparent_hugepage ]; then
      thp_path=/sys/kernel/mm/transparent_hugepage
    elif [ -d /sys/kernel/mm/redhat_transparent_hugepage ]; then
      thp_path=/sys/kernel/mm/redhat_transparent_hugepage
    else
      return 0
    fi

    echo 'never' > ${thp_path}/enabled
    echo 'never' > ${thp_path}/defrag

    re='^[0-1]+$'
    if [[ $(cat ${thp_path}/khugepaged/defrag) =~ $re ]]
    then
      # RHEL 7
      echo 0  > ${thp_path}/khugepaged/defrag
    else
      # RHEL 6
      echo 'no' > ${thp_path}/khugepaged/defrag
    fi

    unset re
    unset thp_path
    ;;
esac
```

随后运行以下命令：

```bash
chmod 755 /etc/init.d/disable-transparent-hugepages
chkconfig --add disable-transparent-hugepages
```

## 设置数据库用户

> 原文地址：https://docs.mongodb.com/manual/tutorial/enable-authentication/

mongodb装好默认是不开启auth的（鉴权authentication与访问授权authorization）。在配置文件中启用auth之前，需要先在默认的 `admin` 库中创建一个 `userAdminAnyDatabase` 角色的用户。该角色可以在任一库中创建用户，但不能对库本身进行操作。

首先在后台启动实例：

```bash
systemctl start mongod
```

随后使用mongo命令行登录，并用以下命令创建第一个用户：

```javascript
use admin
db.createUser(
  {
    user: "myUserAdmin",
    pwd: "abc123",
    roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
  }
)
```
随后退出客户端。至此已具备开启auth的条件。重启服务后使用如下命令重新登录：

```bash
mongo -u "myUserAdmin" -p "abc123" --authenticationDatabase "admin"
```

然后新建其他用户：

```javascript
use test
db.createUser(
  {
    user: "myTester",
    pwd: "xyz123",
    roles: [ { role: "readWrite", db: "test" },
             { role: "read", db: "reporting" } ]
  }
)
```

> 注：mongodb的用户可以创建在任何一个库中，通过角色可以为其分配访问其他库的权限。但经实际测试，使用客户端登录时，登录的库必须是该用户所在的库，只能用use命令切换至其他库访问。这点比较奇怪，还待探明。

## 大功告成

最后一步，当然是设置开机自动启动服务啦。

```bash
systemctl enable mongod
```

## 未完待续

过段时间会继续补充mongodb集群模式的安装和配置。敬请期待！

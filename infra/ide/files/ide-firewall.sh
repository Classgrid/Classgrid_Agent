#!/bin/sh
# User editor boxes (172.30.0.0/16) may not start connections to AWS secrets, private networks or this machine.
S=172.30.0.0/16
for d in 169.254.0.0/16 172.31.0.0/16 10.0.0.0/8 192.168.0.0/16 172.17.0.0/16; do
  iptables -C DOCKER-USER -s $S -d $d -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -I DOCKER-USER -s $S -d $d -m conntrack --ctstate NEW -j DROP
done
iptables -C INPUT -s $S -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -I INPUT -s $S -m conntrack --ctstate NEW -j DROP

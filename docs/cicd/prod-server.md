---
type: howto
---

# Production Docker Host

> Hand-written. Update manually when the host configuration changes.

## Access

- Host: `179.237.104.48`
- SSH config alias: `prod-server` (see `~/.ssh/config`)
- Admin user: `deploy` (passwordless sudo via `/etc/sudoers.d/deploy`, key-only SSH login)
- Original cloud-init `ubuntu` user: password locked, removed from `sudo`, blocked from SSH (`AllowUsers deploy` in sshd config)
- `root` SSH login: disabled

```
ssh prod-server
```

## OS

Ubuntu 26.04 LTS ("resolute").

## SSH hardening

Drop-in config at `/etc/ssh/sshd_config.d/99-hardening.conf`:

```
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AllowUsers deploy
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

## Firewall

`ufw` active, default-deny incoming, only `22/tcp` (OpenSSH) open. `ufw-docker` (https://github.com/chaifeng/ufw-docker) installed so Docker's own iptables rules for published container ports go through `ufw` instead of bypassing it — publish ports bound to `127.0.0.1` behind a reverse proxy where possible, or explicitly `ufw-docker allow <container> <port>` for anything that needs to be public.

## Other host hardening

- `fail2ban` active on the `sshd` jail
- `unattended-upgrades` enabled for automatic security patches

## Docker

Docker CE + Compose plugin installed from the official `download.docker.com` apt repo. Daemon config at `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "no-new-privileges": true,
  "live-restore": true
}
```

`deploy` is a member of the `docker` group (in addition to `sudo`), so `docker` commands work without `sudo`.

### Not enabled

- `userns-remap` — would reduce container-breakout blast radius further, but complicates bind-mount UID ownership. Revisit once workload volume needs are known.
- Non-default SSH port — left at `22`; `fail2ban` + key-only auth cover the brute-force risk for now.

## Setup log

Provisioned 2026-08-21. Steps were run interactively over SSH, verifying each stage (sshd syntax check, firewall status, fresh-connection test) before proceeding to the next.

---
id: quic-vs-tcp
title: "QUIC vs TCP：为什么要重新发明传输层"
wiki: "前端学习"
meta_type: comparison
domains: ["#技术/网络"]
status: mature
created: 2026-02-10
updated: 2026-04-29

sources:
  - title: "HTTP 演化史"
    path: "raw/2026-02-10-http-evolution.md"

relations:
  - to: tcp-head-of-line-blocking
    type: extends

derived_from: []
splits_into: []
---

| | TCP | QUIC |
|---|---|---|
| 多路复用 | 仅应用层（HTTP/2 仍受 HoL 限制） | 传输层多 stream，独立丢包恢复 |
| 握手 | 3-way + TLS 单独握手 | 0-RTT / 1-RTT 集成 TLS |
| 连接迁移 | 五元组绑定，IP 变化即断 | Connection ID，跨网络无缝迁移 |

QUIC 不是"更快的 TCP"，而是承认了"传输层语义需要跟应用层绑定"。这是反 OSI 分层教条的设计，但更贴合现代应用——视频会议、移动网络、CDN 都受益于此。

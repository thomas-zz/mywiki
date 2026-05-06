---
id: http2-multiplexing-limit
title: "HTTP/2 多路复用的天花板"
wiki: "前端学习"
meta_type: observation
domains: ["#技术/网络"]
status: mature
created: 2026-02-10
updated: 2026-02-10

sources:
  - title: "HTTP 演化史"
    path: "raw/2026-02-10-http-evolution.md"

relations:
  - to: tcp-head-of-line-blocking
    type: instance-of

derived_from: []
splits_into: []
---

HTTP/2 在一个 TCP 连接上跑多个 stream，理论上消除了 HTTP/1.1 的连接级队头阻塞。但只要 TCP 丢包，所有 stream 都得停下等重传——传输层的 HoL 把应用层的努力一笔勾销。这就是 QUIC 出现的直接动因。

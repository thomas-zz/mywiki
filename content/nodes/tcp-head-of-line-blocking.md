---
id: tcp-head-of-line-blocking
title: "TCP 队头阻塞的成因链"
wiki: "前端学习"
meta_type: model
domains: ["#技术/网络"]
status: mature
created: 2026-01-19
updated: 2026-04-29

sources:
  - title: "TCP 协议精讲"
    path: "raw/2026-01-19-tcp.md"

relations:
  - to: quic-vs-tcp
    type: contrasts
  - to: http2-multiplexing-limit
    type: extends
    note: "应用层多路复用救不了传输层 HoL"

derived_from: []
splits_into: []
---

TCP 把字节流当作严格有序的整体——任何一个分段丢失，后面的分段哪怕已到达，也必须等丢失分段重传补齐才能交给上层。

这就是队头阻塞：**有序保证 = 一损俱损**。HTTP/1.1 的同域并发限制和 HTTP/2 的多路复用都没有解决它，因为它根植于传输层。要解决就得换一层——QUIC 在 UDP 之上自建多 stream，每个 stream 独立处理丢包，绕过了 TCP 的全局有序约束。

理解这一点的价值不在于记住"TCP 有 HoL"，而在于看到一个普适模式：**强一致性约束在出错时会放大代价**。

---
id: react-fiber-why-linked-list
title: "React Fiber 为什么用链表"
wiki: "前端学习"
meta_type: insight
domains: ["#技术/前端"]
status: mature
created: 2026-04-15
updated: 2026-04-15

sources: []

relations:
  - to: interruptible-rendering
    type: implements

derived_from: []
splits_into: []
---

递归遍历 fiber 树意味着调用栈不能中断——浏览器要插队渲染、要响应输入，必须等递归走完。

链表 + 显式指针让 React 把"遍历状态"从 JS 调用栈搬到了堆里。每处理完一个 fiber 节点，就检查一次时间预算（5ms 默认），不够就把当前指针存下来，交还主线程。下次再继续。

**机制本身不复杂，难的是看出"递归 → 链表"是为了换取"可中断"这个可调度性**。

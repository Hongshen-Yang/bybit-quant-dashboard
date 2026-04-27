---
name: bybit-v5-api
description: "Use when working with Bybit V5 API, the bybit-api SDK, endpoint functions, request/response shapes, signing, auth, or when you need Bybit docs/examples for balances, orders, positions, market data, assets, or account endpoints."
---

## Bybit V5 API

Use the community SDK docs first when you need concrete method names or examples:

- [bybit-api endpoint function list](https://github.com/tiagosiebler/bybit-api/blob/master/docs/endpointFunctionList.md)

Use the raw Bybit documentation when you need official request/response details or parameter rules:

- [Bybit V5 API guide](https://bybit-exchange.github.io/docs/v5/guide)

## What to check

- Endpoint names and categories
- Required and optional parameters
- Account type differences such as FUND, UNIFIED, SPOT, and CONTRACT
- Authentication, timestamps, recv_window, and signing behavior
- Error codes and response shapes

## Working rule

If the SDK example and the official docs disagree, prefer the official Bybit docs for protocol details and the SDK docs for actual method usage.
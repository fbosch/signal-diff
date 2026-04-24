# Changelog

## 1.0.0 (2026-04-24)


### Features

* **adapter:** add function structural deltas ([#34](https://github.com/fbosch/signal-diff/issues/34)) ([ae253f8](https://github.com/fbosch/signal-diff/commit/ae253f8e7bb4994c099b9011c3221da59b89e237))
* **adapter:** add module fan-out delta baseline ([#33](https://github.com/fbosch/signal-diff/issues/33)) ([3131a26](https://github.com/fbosch/signal-diff/commit/3131a26a2b4e7e30d13b9a4d4c80411f17eca1e8))
* **adapter:** add signature feature deltas ([#36](https://github.com/fbosch/signal-diff/issues/36)) ([d48ca96](https://github.com/fbosch/signal-diff/commit/d48ca9694b1272e6deea2de1250da51c6d4f11e7))
* **adapter:** add ts-morph monorepo loader ([fad429d](https://github.com/fbosch/signal-diff/commit/fad429d688dd8e99ff03fff190352b339195e619))
* **adapter:** add ts-morph monorepo project loader ([63ef12b](https://github.com/fbosch/signal-diff/commit/63ef12b52ace6e3106bee6007937032ed3e5b601))
* **adapter:** extract canonical entities ([abb4767](https://github.com/fbosch/signal-diff/commit/abb47677aa26ab79793c03e0dfdca4c0a19a4a39))
* **adapter:** extract canonical entities ([6098c0f](https://github.com/fbosch/signal-diff/commit/6098c0f12fedb385ebe50242addb4397a1393857))
* **bench:** add benchmark result contract and baseline flow ([#22](https://github.com/fbosch/signal-diff/issues/22)) ([5888dd8](https://github.com/fbosch/signal-diff/commit/5888dd8959a1f2b022e66e2e9d03ec4a4bac92a9))
* **bench:** add configurable drift thresholds ([#24](https://github.com/fbosch/signal-diff/issues/24)) ([1f08a62](https://github.com/fbosch/signal-diff/commit/1f08a62dc64ce56f2bc6b1ea01e7aa86984c04d8))
* **bench:** add deterministic harness scaffolding ([46d9cdc](https://github.com/fbosch/signal-diff/commit/46d9cdce2a3a9fe4f89cb85d2b2d988791dba217))
* **bench:** add deterministic harness scaffolding ([7e8f6ac](https://github.com/fbosch/signal-diff/commit/7e8f6acc0a7846f7e2c3744294ce55a8b1ce6654))
* **bench:** add drift reporting highlights ([#26](https://github.com/fbosch/signal-diff/issues/26)) ([4fc3dcf](https://github.com/fbosch/signal-diff/commit/4fc3dcfe144bf953e49f7871905cce1a4c2dd47a))
* **bench:** add PR drift check workflow ([#23](https://github.com/fbosch/signal-diff/issues/23)) ([75432f4](https://github.com/fbosch/signal-diff/commit/75432f445243dc8f090124a4b534d01e0276ce19))
* **bench:** add scheduled trend benchmark workflow ([#25](https://github.com/fbosch/signal-diff/issues/25)) ([bd417f6](https://github.com/fbosch/signal-diff/commit/bd417f6f5e454e7b84da015d8e60811f4c239640))
* **bench:** add trend guardrail signals ([#31](https://github.com/fbosch/signal-diff/issues/31)) ([2419cc1](https://github.com/fbosch/signal-diff/commit/2419cc11ee88311a31b0eac74cd0d5d99e49f42d))
* **bench:** publish scheduled trend summaries ([#30](https://github.com/fbosch/signal-diff/issues/30)) ([a7b3f4a](https://github.com/fbosch/signal-diff/commit/a7b3f4ac0892387cf503df8261eb7ccdf7678330))
* **ci:** add release automation workflows ([c897ce7](https://github.com/fbosch/signal-diff/commit/c897ce7d60b7975dc1b894662fc83101abafa413))
* **cli:** add monorepo workspace and tsconfig discovery ([ba6d44d](https://github.com/fbosch/signal-diff/commit/ba6d44d6e53d525743b2ba2156c18c33f8a414b4))
* **cli:** add SIG-14 monorepo workspace discovery ([c1035d9](https://github.com/fbosch/signal-diff/commit/c1035d9475ef10feca7e743ea1210480664ee1b9))
* **cli:** ingest git diff context ([fef5d99](https://github.com/fbosch/signal-diff/commit/fef5d991ee723a7d759904735046ab9014e0ef7d))
* **core:** define canonical review contracts ([1dfff26](https://github.com/fbosch/signal-diff/commit/1dfff2661315e2ee18dd31dc9485198aa07ad799))
* **reporting:** define v1 json contract ([5605582](https://github.com/fbosch/signal-diff/commit/5605582424e0f2b8f53c70c69702bdb6bdfabf69))


### Bug Fixes

* **adapter:** address PR extraction feedback ([4eda9f6](https://github.com/fbosch/signal-diff/commit/4eda9f6e2964da5c37567afcc1040cfb5c5ab402))
* **adapter:** address PR loader feedback ([539e212](https://github.com/fbosch/signal-diff/commit/539e212d5e2c1402433584e7b9b6810f081862f2))
* **cli:** exclude unresolved tsconfig references ([59c1bdf](https://github.com/fbosch/signal-diff/commit/59c1bdf7c0930b340b197a25970daa6d3b1fb3fa))
* **cli:** harden git diff loading ([688476e](https://github.com/fbosch/signal-diff/commit/688476e9d8a8ca2507f17f3f891f32bc485c75ff))
* **cli:** harden pnpm workspace pattern parsing ([5a98793](https://github.com/fbosch/signal-diff/commit/5a9879316134aa6000978152104695811cd94409))
* **cli:** inherit aliases through tsconfig extends ([b181da3](https://github.com/fbosch/signal-diff/commit/b181da313d1ccf3b24b2264b4b016eb7a1dd1641))
* **cli:** normalize workspace roots for tsconfig discovery ([ec0d1f2](https://github.com/fbosch/signal-diff/commit/ec0d1f2fd279b394f719f3e5b58e41c351185aa4))
* **cli:** parse tsconfig via TypeScript APIs ([f9f4704](https://github.com/fbosch/signal-diff/commit/f9f470411c5c501f562c9abfea8012af37559b04))
* **cli:** preserve stub review request ([39f2497](https://github.com/fbosch/signal-diff/commit/39f24972be2f7a0ee3746418255c4fbf2e1f780d))
* **cli:** support recursive workspace glob patterns ([6fec0d1](https://github.com/fbosch/signal-diff/commit/6fec0d1632a8734327adedeb79cfc85d34dbf856))
* **cli:** tolerate invalid package metadata in discovery ([dcb8582](https://github.com/fbosch/signal-diff/commit/dcb858240011fee4e33e4d15a98a889d61ac1d92))
* **core:** align stub contracts with spec ([0b603f4](https://github.com/fbosch/signal-diff/commit/0b603f47cff908ca50af4db049cf049592113c0d))
* **reporting:** validate nested json fields ([aced65f](https://github.com/fbosch/signal-diff/commit/aced65f51eb53fabf710528a15b34867bb8b9c3b))
* **test:** use portable test glob ([1badd3f](https://github.com/fbosch/signal-diff/commit/1badd3f958f8901f81b01f513f40a43cfb93d434))
* **workflow:** simplify Worktrunk gate alias ([e82d2a9](https://github.com/fbosch/signal-diff/commit/e82d2a9b30236ad78e20b8c044c115a1bd4506e6))

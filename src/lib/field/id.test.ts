import assert from "node:assert/strict";
import test from "node:test";
import { randomId } from "./id";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("randomId works without crypto.randomUUID", () => {
  const ids = new Set(Array.from({ length: 20 }, () => randomId()));
  assert.equal(ids.size, 20);
  for (const id of ids) assert.match(id, uuid);
});

import assert from "node:assert/strict";
import test from "node:test";
import { decisionSummary } from "./job-facts";

test("an accepted job says whether it was sent back", () => {
  assert.equal(decisionSummary({ status: "approved", rejectionCount: 0, rejectionMessage: null }), "Accepted on the first review.");
  assert.equal(decisionSummary({ status: "approved", rejectionCount: 2, rejectionMessage: "Blurry photo" }), "Accepted after being sent back 2 times.");
});

test("a rejected job keeps the reason", () => {
  assert.equal(decisionSummary({ status: "rejected", rejectionCount: 1, rejectionMessage: "Wrong meter number" }), "Rejected. Wrong meter number");
  assert.equal(decisionSummary({ status: "rejected", rejectionCount: 1, rejectionMessage: "  " }), "Rejected. No reason was written.");
});

test("a waiting job keeps the last note", () => {
  assert.equal(
    decisionSummary({ status: "resubmitted", rejectionCount: 1, rejectionMessage: "Retake the water point" }),
    "Waiting for review. Sent back 1 time. Last note: Retake the water point",
  );
});

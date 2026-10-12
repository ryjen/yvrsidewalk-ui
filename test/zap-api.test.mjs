import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MAX_INVOICE_SATS,
  parseMaxSats,
  resolveZapEndpoint,
  resolveHistoryEndpoint,
  validateInvoice,
  requestInvoice,
} from "../src/common/zap-api.ts";

test("default and configured upper limit", () => {
  assert.equal(parseMaxSats(undefined), DEFAULT_MAX_INVOICE_SATS);
  assert.equal(parseMaxSats("200"), 200);
  for (const value of ["0", "-2", "10.0", "1e3", "nan", "9007199254740993"]) {
    assert.equal(parseMaxSats(value), null);
  }
});

test("requires an explicit HTTPS origin", () => {
  assert.equal(resolveZapEndpoint(undefined), null);
  assert.equal(resolveZapEndpoint("https://api.example.org"), "https://api.example.org/zap");
  assert.equal(resolveZapEndpoint("https://api.example.org:8443/"), "https://api.example.org:8443/zap");
  assert.equal(resolveZapEndpoint("http://api.example.org"), null);
  assert.equal(resolveZapEndpoint("https://api.example.org/foo"), null);
  assert.equal(resolveZapEndpoint("https://api.example.org/?token=x"), null);
  assert.equal(resolveZapEndpoint("https://user:pass@api.example.org"), null);
  assert.equal(resolveZapEndpoint("https://api.example.org#fragment"), null);
  assert.equal(resolveZapEndpoint(" https://api.example.org"), null);
});

test("development HTTP exception is loopback-only", () => {
  assert.equal(resolveZapEndpoint("http://localhost:4000", true), "http://localhost:4000/zap");
  assert.equal(resolveZapEndpoint("http://127.0.0.1:4000", true), "http://127.0.0.1:4000/zap");
  assert.equal(resolveZapEndpoint("http://localhost:4000", false), null);
  assert.equal(resolveZapEndpoint("http://192.0.2.4:4000", true), null);
  assert.equal(resolveZapEndpoint("http://example.org:4000", true), null);
});

test("validates canonical whole satoshis and memo", () => {
  assert.deepEqual(validateInvoice("100", "memo", 100000), { amount: 100, memo: "memo" });
  for (const value of ["", "0", "-2", "1.1", "01", "1e3", "100001", "9007199254740993"]) {
    assert.equal(validateInvoice(value, "", 100000), null);
  }
  assert.equal(validateInvoice("2", "🙂".repeat(50), 100000)?.amount, 2);
  assert.equal(validateInvoice("2", "🙂".repeat(51), 100000), null);
  assert.equal(validateInvoice("2", "a\nb", 100000), null);
});

test("calls configured endpoint with receive-only-style input", async () => {
  let called;
  const hash = "e".repeat(64);
  const fake = async (url, init) => {
    called = {url,init};
    return {ok:true,status:201,json:async()=>({payment_hash:hash,other:"discard"})};
  };
  const result=await requestInvoice("https://api.example.org/zap","42","lunch",100000,fake);
  assert.equal(result,hash);
  assert.equal(called.url,"https://api.example.org/zap");
  assert.deepEqual(JSON.parse(called.init.body),{amount:42,memo:"lunch"});
  assert.equal(called.init.headers["Content-Type"],"application/json");
  assert.ok(!called.init.headers["X-Api-Key"]);
});

test("invalid payload never invokes network", async () => {
  const fake=async()=>{assert.fail("network invoked");};
  await assert.rejects(requestInvoice("https://api.example.org/zap","-1","",100000,fake),/valid whole/);
});

test("rate limiting and busy responses are surfaced without upstream contents", async () => {
  const fake429=async()=>({ok:false,status:429,json:async()=>({secret:"no"})});
  const fake503=async()=>({ok:false,status:503,json:async()=>({secret:"no"})});
  await assert.rejects(requestInvoice("https://api.example.org/zap","2","",100000,fake429),/Too many requests/);
  await assert.rejects(requestInvoice("https://api.example.org/zap","2","",100000,fake503),/busy/);
});

test("invalid or missing payment hash is rejected", async () => {
  for(const data of [null,{}, {payment_hash:"not-a-hash"},{payment_hash:5}]){
    const fake=async()=>({ok:true,status:201,json:async()=>data});
    await assert.rejects(requestInvoice("https://api.example.org/zap","2","",100000,fake),/invalid response/);
  }
});

test("network failures do not expose transport diagnostics", async () => {
  const fake=async()=>{throw new Error("secret transport details");};
  await assert.rejects(
    requestInvoice("https://api.example.org/zap","2","",100000,fake),
    (error)=>error.message.includes("Unable to contact") && !error.message.includes("secret")
  );
});

test("broken JSON is reported as an invalid provider response", async () => {
  const fake=async()=>({ok:true,status:201,json:async()=>{throw new Error("raw response");}});
  await assert.rejects(
    requestInvoice("https://api.example.org/zap","2","",100000,fake),
    (error)=>error.message.includes("invalid response") && !error.message.includes("raw")
  );
});

test("History and Zap share one validated API origin", () => {
  assert.equal(resolveHistoryEndpoint(undefined), null);
  assert.equal(resolveHistoryEndpoint("https://api.example.org"), "https://api.example.org/history");
  assert.equal(resolveHistoryEndpoint("http://localhost:4000", false), null);
  assert.equal(resolveHistoryEndpoint("http://localhost:4000", true), "http://localhost:4000/history");
  assert.equal(resolveHistoryEndpoint("https://api.example.org/?key=fake"), null);
});

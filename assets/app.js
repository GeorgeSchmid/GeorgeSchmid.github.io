(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var num = function (id) { var el = $(id); if (!el) return 0; var v = parseFloat(String(el.value).replace(",", ".")); return isFinite(v) ? v : 0; };

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  var cur = $("currency");
  if (cur) { var saved = store("hpt-currency"); if (saved) cur.value = saved; }
  function money(v, dec) {
    var sym = cur ? cur.value : "€";
    var d = dec === undefined ? (Math.abs(v) < 1000 ? 2 : 0) : dec;
    var s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    return (v < 0 ? "−" : "") + sym + s;
  }
  function pct(v) { return isFinite(v) ? (v * 100).toFixed(1) + "%" : "–"; }
  function set(id, text, neg) { var el = $(id); if (!el) return; el.textContent = text; if (neg !== undefined) el.classList.toggle("neg", !!neg); }

  var calcs = {
    profit: function () {
      var rate = num("rate"), nights = num("nights"), stays = Math.max(num("stays"), 0), cfee = num("cleanfee");
      var f = num("fee") / 100, ccost = num("cleancost"), supplies = num("supplies"), fixed = num("fixed"), days = Math.max(num("days"), 1);
      var gross = rate * nights + cfee * stays, fees = gross * f, variable = (ccost + supplies) * stays;
      var net = gross - fees - variable - fixed;
      set("r-net", money(net, 0), net < 0);
      set("r-gross", money(gross, 0)); set("r-fees", "−" + money(fees, 0)); set("r-var", "−" + money(variable, 0)); set("r-fixed", "−" + money(fixed, 0));
      set("r-margin", gross > 0 ? pct(net / gross) : "–");
      set("r-occ", pct(nights / days)); set("r-year", money(net * 12, 0));
      var L = stays > 0 ? nights / stays : 0;
      var perNight = rate * (1 - f) + (L > 0 ? (cfee * (1 - f) - ccost - supplies) / L : 0);
      var be = perNight > 0 ? fixed / perNight : Infinity;
      set("r-be", isFinite(be) ? (Math.ceil(be) + " nights (" + pct(be / days) + ")") : "not reachable at this rate");
    },
    occupancy: function () {
      var booked = num("booked"), days = num("days"), units = Math.max(num("units"), 1), blocked = num("blocked"), rev = num("revenue");
      var avail = Math.max(days * units - blocked, 0);
      var occ = avail > 0 ? booked / avail : NaN;
      set("r-occ", pct(occ), false);
      set("r-avail", avail.toLocaleString("en-US") + " nights");
      set("r-empty", Math.max(avail - booked, 0).toLocaleString("en-US") + " nights");
      set("r-adr", booked > 0 && rev > 0 ? money(rev / booked) : "–");
      set("r-revpar", avail > 0 && rev > 0 ? money(rev / avail) : "–");
      var w = $("warn"); if (w) w.hidden = !(booked > avail && avail > 0);
    },
    fees: function () {
      var f = num("fee") / 100;
      if (mode === "payout") {
        var price = num("rate") * num("nights") + num("cleanfee");
        var fee = price * f, pay = price - fee;
        set("r-main-k", "Your payout"); set("r-main", money(pay), pay < 0);
        set("r-a-k", "Booking total (before tax)"); set("r-a", money(price));
        set("r-b-k", "Platform fee"); set("r-b", "−" + money(fee));
        set("r-c-k", "Payout per night"); set("r-c", num("nights") > 0 ? money(pay / num("nights")) : "–");
      } else {
        var want = num("target"), n = Math.max(num("nights2"), 1), cf = num("cleanfee2");
        var total = f < 1 ? want / (1 - f) : NaN, nightly = (total - cf) / n;
        set("r-main-k", "Charge per night"); set("r-main", isFinite(nightly) ? money(nightly) : "–", nightly < 0);
        set("r-a-k", "Booking total to charge"); set("r-a", isFinite(total) ? money(total) : "–");
        set("r-b-k", "Platform fee"); set("r-b", isFinite(total) ? "−" + money(total - want) : "–");
        set("r-c-k", "You receive"); set("r-c", money(want));
      }
    },
    rate: function () {
      var fixed = num("fixed"), nights = Math.max(num("nights"), 0.0001), L = Math.max(num("stay"), 1), per = num("perstay");
      var cf = num("cleanfee"), f = num("fee") / 100, target = num("target");
      var stays = nights / L, k = nights * (1 - f);
      var base = fixed + per * stays - cf * stays * (1 - f);
      var be = k > 0 ? base / k : NaN, tr = k > 0 ? (base + target) / k : NaN;
      set("r-target", isFinite(tr) ? money(Math.max(tr, 0)) : "–");
      set("r-be", isFinite(be) ? money(Math.max(be, 0)) : "–");
      set("r-stays", stays.toFixed(1));
      var gross = Math.max(tr, 0) * nights + cf * stays;
      set("r-gross", money(gross, 0)); set("r-fees", "−" + money(gross * f, 0));
    }
  };

  var page = document.body.getAttribute("data-calc"), mode = "payout";
  var run = calcs[page];
  if (!run) return;
  document.querySelectorAll(".calc input, .calc select").forEach(function (el) {
    el.addEventListener("input", function () { if (el.id === "currency") store("hpt-currency", el.value); if (el.id === "fee") clearPresets(); run(); });
  });
  function clearPresets() { document.querySelectorAll(".presets button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-fee") === $("fee").value); }); }
  document.querySelectorAll(".presets button").forEach(function (b) {
    b.addEventListener("click", function () { $("fee").value = b.getAttribute("data-fee"); clearPresets(); run(); });
  });
  document.querySelectorAll(".tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      mode = b.getAttribute("data-mode");
      document.querySelectorAll(".tabs button").forEach(function (x) { x.classList.toggle("on", x === b); });
      document.querySelectorAll("[data-show]").forEach(function (x) { x.hidden = x.getAttribute("data-show") !== mode; });
      run();
    });
  });
  clearPresets();
  run();
})();

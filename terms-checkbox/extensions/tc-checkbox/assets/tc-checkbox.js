/**
 * Terms & Conditions Checkbox — Storefront JavaScript
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibilities:
 *  1. Intercepting checkout clicks/submits and showing error when unchecked
 *  2. Visual dimming of checkout buttons (NO disabled attribute)
 *  3. Showing/hiding the error message with shake animation
 *  4. Logging consent to the App Proxy endpoint (fire-and-forget)
 *  5. Writing cart attributes for order-level consent records
 *  6. Supporting drawer/slide-out carts via MutationObserver
 *
 * IMPORTANT: We do NOT set disabled on buttons. That prevents click events
 * from firing, which means the user never sees the error message.
 * Instead we keep buttons clickable, intercept the action, and show error.
 */

(function () {
  "use strict";

  // ── 1. INITIALIZATION ──────────────────────────────────────────────────────

  var wrappers = document.querySelectorAll(".tc-checkbox-wrapper");
  if (!wrappers.length) return;

  var primaryWrapper = document.getElementById("tc-checkbox-wrapper") ||
                       document.getElementById("tc-checkbox-wrapper-drawer-config");
  if (!primaryWrapper) return;

  var isRequired     = primaryWrapper.dataset.required !== "false";
  var shouldLog      = primaryWrapper.dataset.logConsent !== "false";
  var proxyUrl       = primaryWrapper.dataset.proxyUrl || "";
  var shop           = primaryWrapper.dataset.shop || "";
  var blockExpress   = primaryWrapper.dataset.blockExpress !== "false";
  var errorText      = primaryWrapper.dataset.errorMessage ||
    "You must agree to the terms and conditions before checking out.";

  if (!isRequired) return;

  // ── 2. SELECTORS ──────────────────────────────────────────────────────────

  var CHECKOUT_SELECTORS = [
    '[name="checkout"]',
    'button[name="checkout"]',
    'input[name="checkout"]',
    'a[href="/checkout"]',
    'a[href*="/checkout"]',
    '.cart__checkout-button',
    '.cart__checkout',
    '.cart__submit',
    '#cart-checkout-button',
    '#checkout',
    '[data-checkout-button]',
    '[data-cart-checkout]',
    'form[action="/checkout"] button[type="submit"]',
    'form[action="/checkout"] input[type="submit"]',
    'form[action="/cart"] button[name="checkout"]',
    '[formaction="/checkout"]',
    '[formaction*="/checkout"]',
    '.cart-drawer__checkout',
    '.cart-drawer [name="checkout"]',
    '.mini-cart [name="checkout"]',
    '.side-cart [name="checkout"]',
  ].join(", ");

  var EXPRESS_SELECTORS = [
    ".shopify-payment-button",
    ".dynamic-checkout__buttons",
    '[data-shopify="dynamic-checkout-cart"]',
    ".additional-checkout-buttons",
    "#dynamic-checkout-cart",
    ".cart__dynamic-checkout-buttons",
    ".cart__ctas .additional-checkout-buttons",
    ".cart-drawer .shopify-payment-button",
    ".cart-drawer .dynamic-checkout__buttons",
  ].join(", ");

  var DRAWER_SELECTORS = [
    "cart-drawer",
    ".cart-drawer",
    "#cart-drawer",
    "#CartDrawer",
    ".mini-cart",
    ".side-cart",
    ".cart-sidebar",
    ".drawer--cart",
    "[data-cart-drawer]",
    "[data-mini-cart]",
    ".ajaxcart",
    ".ajax-cart",
    "#cart-notification",
    ".cart-notification",
  ].join(", ");

  // ── 3. DOM HELPERS ─────────────────────────────────────────────────────────

  function getCheckbox() {
    return (
      document.getElementById("tc-agree-checkbox") ||
      document.getElementById("tc-agree-checkbox-inline") ||
      document.querySelector(".tc-checkbox-input")
    );
  }

  function getErrorEl() {
    return (
      document.getElementById("tc-error-message") ||
      document.getElementById("tc-error-message-inline") ||
      document.querySelector(".tc-error-message")
    );
  }

  function isChecked() {
    // Check ALL checkbox instances (main + drawer) — any checked = agreed
    var allCheckboxes = document.querySelectorAll(".tc-checkbox-input");
    for (var i = 0; i < allCheckboxes.length; i++) {
      if (allCheckboxes[i].checked) return true;
    }
    return false;
  }

  function isCheckoutElement(el) {
    if (!el || el === document) return false;
    if (el.matches && el.matches(CHECKOUT_SELECTORS)) return true;
    var href = el.getAttribute && el.getAttribute("href");
    if (href && (href === "/checkout" || href.indexOf("/checkout") !== -1)) return true;
    var formaction = el.getAttribute && el.getAttribute("formaction");
    if (formaction && formaction.indexOf("/checkout") !== -1) return true;
    var name = el.getAttribute && el.getAttribute("name");
    if (name === "checkout") return true;
    return false;
  }

  function isInsideDrawer(el) {
    if (!el || el === document) return false;
    var node = el;
    while (node && node !== document) {
      if (node.classList && node.classList.contains("tc-drawer-checkbox-wrapper")) return true;
      if (node.matches && node.matches(DRAWER_SELECTORS)) return true;
      node = node.parentElement;
    }
    return false;
  }

  function isExpressCheckoutElement(el) {
    if (!el || el === document || !blockExpress) return false;
    var node = el;
    while (node && node !== document) {
      if (node.matches && node.matches(EXPRESS_SELECTORS)) return true;
      node = node.parentElement;
    }
    return false;
  }

  // ── 4. VISUAL STATE (CSS only — NO disabled attribute) ────────────────────
  //
  // We add a CSS class for visual dimming but keep buttons fully clickable
  // so click/submit interceptors can show the error message.

  function updateCheckoutState() {
    var checked = isChecked();
    var checkoutBtns = document.querySelectorAll(CHECKOUT_SELECTORS);
    var expressBtns  = blockExpress
      ? document.querySelectorAll(EXPRESS_SELECTORS)
      : [];

    if (!checked) {
      checkoutBtns.forEach(function (btn) {
        btn.classList.add("tc-checkout-blocked");
        btn.setAttribute("aria-disabled", "true");
      });
      expressBtns.forEach(function (el) {
        el.classList.add("tc-express-overlay");
      });
    } else {
      checkoutBtns.forEach(function (btn) {
        btn.classList.remove("tc-checkout-blocked");
        btn.removeAttribute("aria-disabled");
      });
      expressBtns.forEach(function (el) {
        el.classList.remove("tc-express-overlay");
      });
    }
  }

  // ── 5. T&C LINK CLICK HANDLER ─────────────────────────────────────────────
  // Registered FIRST in capture phase so it fires before any checkout interception.
  // Uses window.open to bypass any theme JS that might swallow clicks.

  document.addEventListener("click", function (e) {
    var link = e.target;
    if (link && link.closest) {
      link = link.closest(".tc-checkbox-link");
    }
    if (!link) return;
    var href = link.getAttribute("href");
    // If it's a <span> (no href), use the default T&C URL
    if (!href) href = "/cart";
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    window.open(href, "_blank", "noopener,noreferrer");
  }, true);

  // ── 6. GLOBAL CLICK INTERCEPTION ──────────────────────────────────────────

  document.addEventListener("click", function (e) {
    if (isChecked()) return;

    // Don't intercept clicks inside our own checkbox wrapper (links, text, etc.)
    var clicked = e.target;
    if (clicked && clicked.closest && (
      clicked.closest(".tc-checkbox-wrapper") ||
      clicked.closest(".tc-drawer-checkbox-wrapper")
    )) return;

    var el = e.target;
    var maxDepth = 10;
    var clickedInDrawer = isInsideDrawer(e.target);
    while (el && el !== document && maxDepth-- > 0) {
      // Stop walking up if we hit our own checkbox wrapper
      if (el.classList && (
        el.classList.contains("tc-checkbox-wrapper") ||
        el.classList.contains("tc-drawer-checkbox-wrapper")
      )) break;

      if (isCheckoutElement(el) || isExpressCheckoutElement(el)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (clickedInDrawer) {
          showDrawerError();
        } else {
          showError();
        }
        scrollToCheckbox();
        return;
      }
      el = el.parentElement;
    }
  }, true); // CAPTURE phase

  // ── 6. GLOBAL FORM SUBMIT INTERCEPTION ────────────────────────────────────

  document.addEventListener("submit", function (e) {
    if (isChecked()) return;

    var form = e.target;
    if (!form || form.tagName !== "FORM") return;

    var action = form.getAttribute("action") || "";
    var submitter = e.submitter;
    var formaction = submitter && submitter.getAttribute("formaction");
    var submitterName = submitter && submitter.getAttribute("name");

    var goingToCheckout =
      action === "/checkout" ||
      action.indexOf("/checkout") !== -1 ||
      (formaction && formaction.indexOf("/checkout") !== -1) ||
      submitterName === "checkout";

    if (goingToCheckout) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var formInDrawer = isInsideDrawer(form);
      if (formInDrawer) {
        showDrawerError();
      } else {
        showError();
      }
      scrollToCheckbox();
    }
  }, true);

  // ── 7. NAVIGATION INTERCEPTION ────────────────────────────────────────────

  (function () {
    try {
      var origDescriptor = Object.getOwnPropertyDescriptor(window, "location");
      if (!origDescriptor || !origDescriptor.set) return;
      var origSet = origDescriptor.set;
      Object.defineProperty(window, "location", {
        get: origDescriptor.get,
        set: function (val) {
          if (!isChecked() && typeof val === "string" && val.indexOf("/checkout") !== -1) {
            showError();
            scrollToCheckbox();
            return;
          }
          origSet.call(window, val);
        },
        configurable: true,
      });
    } catch (e) {
      // Can't override — click/submit interception still works
    }
  })();

  // ── 8. ERROR DISPLAY ──────────────────────────────────────────────────────

  function showError() {
    var errorEl = getErrorEl();
    if (!errorEl) return;

    errorEl.textContent = errorText;
    errorEl.style.display = "block";

    errorEl.style.animation = "none";
    void errorEl.offsetHeight;
    errorEl.style.animation = "tc-shake 0.4s ease";
  }

  function hideError() {
    var errorEl = getErrorEl();
    if (errorEl) errorEl.style.display = "none";
  }

  function hideAllDrawerErrors() {
    var drawerErrors = document.querySelectorAll(".tc-drawer-checkbox-wrapper .tc-error-message");
    drawerErrors.forEach(function (el) { el.style.display = "none"; });
  }

  function showDrawerError() {
    var drawerErrors = document.querySelectorAll(".tc-drawer-checkbox-wrapper .tc-error-message");
    drawerErrors.forEach(function (el) {
      el.textContent = errorText;
      el.style.display = "block";
      el.style.animation = "none";
      void el.offsetHeight;
      el.style.animation = "tc-shake 0.4s ease";
    });
  }

  function scrollToCheckbox() {
    // If a drawer checkbox exists and is visible, scroll to that instead
    var drawerWrapper = document.querySelector(".tc-drawer-checkbox-wrapper");
    if (drawerWrapper && drawerWrapper.offsetParent !== null) {
      drawerWrapper.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    var wrapper = document.getElementById("tc-checkbox-wrapper") ||
                  document.querySelector(".tc-checkbox-wrapper");
    if (wrapper) {
      wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // ── 9. CONSENT LOGGING ────────────────────────────────────────────────────

  function logConsent() {
    if (!shouldLog || !proxyUrl || !shop) return;

    var data = {
      shop: shop,
      consentGiven: true,
      cartToken: getCartToken(),
      customerEmail: getCustomerEmail(),
      pageUrl: window.location.href,
      checkboxVersion: getCheckboxVersion(),
      timestamp: new Date().toISOString(),
    };

    fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(function (err) {
      console.warn("[T&C Checkbox] Consent log failed (non-critical):", err);
    });
  }

  function getCartToken() {
    var cookies = document.cookie.split(";");
    for (var i = 0; i < cookies.length; i++) {
      var parts = cookies[i].trim().split("=");
      if (parts[0] === "cart") return decodeURIComponent(parts[1] || "");
    }
    return null;
  }

  function getCustomerEmail() {
    if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta) {
      return window.ShopifyAnalytics.meta.email || null;
    }
    return null;
  }

  function getCheckboxVersion() {
    var wrapper = document.getElementById("tc-checkbox-wrapper") ||
                  document.querySelector(".tc-checkbox-wrapper");
    if (!wrapper) return null;
    var textEl = wrapper.querySelector(".tc-checkbox-text");
    return textEl ? textEl.textContent.trim().substring(0, 100) : null;
  }

  // ── 10. CART ATTRIBUTES ────────────────────────────────────────────────────

  function setCartAttribute(agreed) {
    var attrs = agreed
      ? { terms_accepted: "yes", terms_accepted_at: new Date().toISOString() }
      : { terms_accepted: "no", terms_accepted_at: "" };

    fetch("/cart/update.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attributes: attrs }),
    }).catch(function (err) {
      console.warn("[T&C Checkbox] Cart attribute update failed (non-critical):", err);
    });
  }

  // ── 11. DRAWER CART SUPPORT ────────────────────────────────────────────────

  function injectDrawerCheckbox(drawer) {
    // Don't inject if already present
    if (drawer.querySelector(".tc-drawer-checkbox-wrapper")) return;

    // ── Find the checkout button in the drawer ──
    // Try Dawn-specific first, then generic selectors
    var checkoutBtn = drawer.querySelector("#CartDrawer-Checkout") ||
                      drawer.querySelector('button[name="checkout"]') ||
                      drawer.querySelector('[name="checkout"]') ||
                      drawer.querySelector('.cart__checkout-button') ||
                      drawer.querySelector('a[href*="/checkout"]');
    if (!checkoutBtn) return;

    // ── Build message from data attributes for a reliable <a> tag ──
    // Use drawer-specific config wrapper first, then fall back to primary wrapper
    var drawerConfig = document.getElementById("tc-checkbox-wrapper-drawer-config") || primaryWrapper;
    var msgText = drawerConfig.dataset.messageText || primaryWrapper.dataset.messageText || "I accept the";
    var lnkText = drawerConfig.dataset.linkText || primaryWrapper.dataset.linkText || "terms and conditions";
    var lnkUrl  = drawerConfig.dataset.linkUrl || primaryWrapper.dataset.linkUrl || "/cart";

    var messageHtml = msgText + " ";
    messageHtml += '<a href="' + lnkUrl + '" target="_blank" rel="noopener noreferrer" class="tc-checkbox-link">' + lnkText + '</a>';

    // ── Build the drawer checkbox HTML ──
    var wrapper = document.createElement("div");
    wrapper.className = "tc-drawer-checkbox-wrapper tc-checkbox-wrapper tc-checkbox-wrapper--inline";

    // Copy CSS custom property tokens from drawer config wrapper (or primary)
    var computedStyle = window.getComputedStyle(drawerConfig);
    var tokens = [
      "--tc-checkbox-color", "--tc-error-color", "--tc-font-size",
      "--tc-text-color", "--tc-link-color", "--tc-link-underline"
    ];
    var styleStr = "";
    tokens.forEach(function (token) {
      var val = computedStyle.getPropertyValue(token).trim();
      if (val) styleStr += token + ": " + val + "; ";
    });
    wrapper.style.cssText = styleStr + "padding: 12px 16px; margin: 0;";

    wrapper.innerHTML =
      '<div class="tc-checkbox-label" style="display:flex;align-items:flex-start;gap:10px;cursor:default;user-select:none;line-height:1.4;font-size:var(--tc-font-size, 14px);">' +
        '<label for="tc-agree-checkbox-drawer" style="display:flex;align-items:center;flex-shrink:0;cursor:pointer;">' +
          '<input type="checkbox" id="tc-agree-checkbox-drawer" class="tc-checkbox-input" name="tc-agree-drawer" aria-required="true" aria-describedby="tc-error-message-drawer" />' +
          '<span class="tc-checkbox-custom" aria-hidden="true"></span>' +
        '</label>' +
        '<span class="tc-checkbox-text" style="color:var(--tc-text-color, #333);">' + messageHtml + '</span>' +
      '</div>' +
      '<div class="tc-error-message" id="tc-error-message-drawer" role="alert" aria-live="assertive" style="display:none;">' +
        errorText +
      '</div>';

    // ── Sync initial state with main checkbox ──
    var mainCb = getCheckbox();
    var drawerCb = wrapper.querySelector(".tc-checkbox-input");
    if (mainCb && mainCb.checked) {
      drawerCb.checked = true;
    }

    // ── Force link clicks to open in new tab ──
    var link = wrapper.querySelector("a.tc-checkbox-link");
    if (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        window.open(link.getAttribute("href"), "_blank", "noopener,noreferrer");
      }, true);
    }

    // ── Insert directly before the checkout button ──
    checkoutBtn.parentNode.insertBefore(wrapper, checkoutBtn);
  }

  // Sync all checkbox instances when any one changes
  function syncAllCheckboxes(sourceCheckbox) {
    var allCheckboxes = document.querySelectorAll(".tc-checkbox-input");
    allCheckboxes.forEach(function (cb) {
      if (cb !== sourceCheckbox) {
        cb.checked = sourceCheckbox.checked;
      }
    });
  }

  function tryInjectDrawerCheckbox() {
    var drawers = document.querySelectorAll(DRAWER_SELECTORS);
    drawers.forEach(function (drawer) {
      // Check for open state via class (Dawn uses .active)
      var hasOpenIndicator = drawer.classList.contains("active") ||
                             drawer.classList.contains("is-open") ||
                             drawer.classList.contains("is-active") ||
                             drawer.classList.contains("drawer--is-open") ||
                             drawer.hasAttribute("open") ||
                             drawer.getAttribute("aria-hidden") === "false";

      // Also check computed visibility for non-Dawn themes
      if (!hasOpenIndicator) {
        try {
          var style = window.getComputedStyle(drawer);
          hasOpenIndicator = style.display !== "none" &&
                             style.visibility !== "hidden" &&
                             style.opacity !== "0";
        } catch (e) {
          // Ignore
        }
      }

      if (hasOpenIndicator) {
        injectDrawerCheckbox(drawer);
      }
    });
  }

  var _debounceTimer = null;
  var observer = new MutationObserver(function (mutations) {
    var relevant = mutations.some(function (m) {
      return (m.type === "childList" && m.addedNodes.length > 0) ||
             m.type === "attributes";
    });
    if (!relevant) return;
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function () {
      tryInjectDrawerCheckbox();
      updateCheckoutState();
    }, 150);
  });

  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "aria-hidden", "open", "style"] });

  // ── 12. EXPRESS CHECKOUT RETRY ────────────────────────────────────────────

  var _expressRetries = 0;
  var _expressInterval = setInterval(function () {
    if (_expressRetries++ >= 10) {
      clearInterval(_expressInterval);
      return;
    }
    var expressBtns = document.querySelectorAll(EXPRESS_SELECTORS);
    if (expressBtns.length > 0) {
      clearInterval(_expressInterval);
      updateCheckoutState();
    }
  }, 500);

  // ── 13. CHECKBOX EVENT LISTENER ───────────────────────────────────────────

  document.addEventListener("change", function (e) {
    if (e.target && e.target.classList.contains("tc-checkbox-input")) {
      syncAllCheckboxes(e.target);
      updateCheckoutState();
      if (e.target.checked) {
        hideError();
        hideAllDrawerErrors();
        logConsent();
        setCartAttribute(true);
      } else {
        setCartAttribute(false);
      }
    }
  });

  // ── 14. INITIALIZE ────────────────────────────────────────────────────────

  function init() {
    updateCheckoutState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  // ─── Tabs ───
  const tabBtns = document.querySelectorAll(".tab-btn");
  const planContents = document.querySelectorAll(".plan-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      planContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document
        .getElementById(btn.getAttribute("data-target"))
        .classList.add("active");
    });
  });

  // ─── Form Selection ───
  const formTabBtns = document.querySelectorAll(".tab-btn-form");

  const formTargetMap = {
    "seller-form": "tasar",
    "buyer-form": "busca",
  };

  formTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // quitar active de botones
      formTabBtns.forEach((b) => b.classList.remove("active"));

      // ocultar todos los wrappers de formulario
      const wrappers = document.querySelectorAll(".form-wrapper");
      wrappers.forEach((w) => w.classList.add("hidden"));

      // activar el botón clickeado
      btn.classList.add("active");

      // calcular id real del wrapper (usar mapeo si hace falta)
      const key = btn.getAttribute("data-target");
      const wrapperId = formTargetMap[key] || key;
      const targetEl = document.getElementById(wrapperId);
      if (targetEl) targetEl.classList.remove("hidden");
    });
  });

  // ─── Smooth scroll ───
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();

      const targetId = this.getAttribute("href").substring(1);
      const target = document.getElementById(targetId);

      if (targetId === "tasar") {
        document.getElementById("tasar").classList.remove("hidden");
        document.getElementById("busca").classList.add("hidden");
      } else if (targetId === "busca") {
        document.getElementById("busca").classList.remove("hidden");
        document.getElementById("tasar").classList.add("hidden");
      }

      if (target) {
        (target.closest("section") || target).scrollIntoView({
          behavior: "smooth",
        });
      }
    });
  });

  // ─── Hero buttons: también deben alternar el formulario de contacto ───
  const heroFormLinks = document.querySelectorAll(
    '.hero-side a[href="#tasar"], .hero-side a[href="#busca"]',
  );
  heroFormLinks.forEach((el) => {
    el.addEventListener("click", () => {
      const href = el.getAttribute("href") || "";
      const targetId = href.replace("#", "");

      const tasarEl = document.getElementById("tasar");
      const buscaEl = document.getElementById("busca");

      if (targetId === "tasar") {
        if (tasarEl) tasarEl.classList.remove("hidden");
        if (buscaEl) buscaEl.classList.add("hidden");
        formTabBtns.forEach((b) => b.classList.remove("active"));
        const sellerBtn = document.querySelector(
          '.tab-btn-form[data-target="seller-form"]',
        );
        if (sellerBtn) sellerBtn.classList.add("active");
      } else if (targetId === "busca") {
        if (buscaEl) buscaEl.classList.remove("hidden");
        if (tasarEl) tasarEl.classList.add("hidden");
        formTabBtns.forEach((b) => b.classList.remove("active"));
        const buyerBtn = document.querySelector(
          '.tab-btn-form[data-target="buyer-form"]',
        );
        if (buyerBtn) buyerBtn.classList.add("active");
      }
    });
  });

  // ─── Formularios ───
  document.querySelectorAll(".lead-form").forEach((form) => {
    // ✅ limpiar errores en tiempo real
    form.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("input", () => {
        input.classList.remove("input-error");

        const next = input.nextElementSibling;
        if (next && next.classList.contains("field-error")) {
          next.remove();
        }
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const rawData = new FormData(form);
      const payload = Object.fromEntries(rawData.entries());

      const wrapperId = form.closest(".form-wrapper").id;
      payload.tipo_lead =
        wrapperId === "tasar"
          ? "Vendedor"
          : wrapperId === "busca"
            ? "Comprador"
            : "Desconocido";

      payload.fecha_registro = new Date().toISOString();
      payload.url_origen = window.location.href;

      const submitBtn = form.querySelector('button[type="submit"]');
      const statusEl = form.querySelector(".form-status");

      // limpiar estado
      clearFieldErrors(form);
      statusEl.textContent = "";
      statusEl.className = "form-status";

      // VALIDACIÓN FRONT
      const frontErrors = validateFront(payload);

      if (frontErrors) {
        showFieldErrors(form, frontErrors);
        statusEl.textContent = "Revisá los campos marcados";
        statusEl.classList.add("error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando...";

      try {
        const response = await fetch(
          "https://krak-usados-worker.rapid-band-96d6.workers.dev/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        const json = await response.json();

        if (!response.ok) {
          if (json.errors) {
            showFieldErrors(form, json.errors);
            statusEl.textContent = "Revisá los campos marcados";
          } else {
            statusEl.textContent = json.error || "Error al enviar";
          }

          statusEl.classList.add("error");
          return;
        }

        statusEl.textContent = json.message || "Enviado correctamente";
        statusEl.classList.add("success");
        form.reset();
      } catch (error) {
        console.error(error);
        statusEl.textContent = "Error de conexión. Intentá nuevamente.";
        statusEl.classList.add("error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Enviar";
      }
    });
  });
});

// ------------------
// VALIDACIÓN FRONT
// ------------------

function validateFront(data) {
  const errors = {};

  if (!data.nombre || data.nombre.length < 3) {
    errors.nombre = "Ingresá un nombre válido";
  }

  if (!validateEmail(data.email)) {
    errors.email = "Email inválido";
  }

  if (!data.telefono || !/^\d{6,15}$/.test(data.telefono.replace(/\s+/g, ""))) {
    errors.telefono = "Teléfono inválido (solo números)";
  }

  if (data.tipo_lead === "Vendedor") {
    if (!data.direccion || data.direccion.length < 5) {
      errors.direccion = "Ingresá una dirección válida";
    }
  }

  if (data.tipo_lead === "Comprador") {
    if (!data.zona || data.zona.length < 3) {
      errors.zona = "Ingresá una zona válida";
    }
  }

  return Object.keys(errors).length ? errors : null;
}

// ------------------
// HELPERS
// ------------------

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clearFieldErrors(form) {
  form
    .querySelectorAll(".input-error")
    .forEach((el) => el.classList.remove("input-error"));

  form.querySelectorAll(".field-error").forEach((el) => el.remove());
}

function showFieldErrors(form, errors) {
  Object.entries(errors).forEach(([field, message]) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (!input) return;

    input.classList.add("input-error");

    const errorEl = document.createElement("div");
    errorEl.className = "field-error";
    errorEl.textContent = message;

    input.insertAdjacentElement("afterend", errorEl);
  });
}

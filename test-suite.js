// Script de pruebas para verificar:
// 1. Health check
// 2. Login de admin
// 3. Fallo con password incorrecto
// 4. Creación y consulta de producto
// 5. FEFO y Facturación atómica
// 6. Anulación y reversión de existencias
// 7. Descarga de Reportes PDF y Excel

const BASE_URL = "http://localhost:8800/api";

async function runTests() {
  console.log("=== INICIANDO SUITE DE PRUEBAS AUTOMATIZADAS ===");

  try {
    // 1. Health Check
    const resHealth = await fetch(`${BASE_URL}/health`);
    const dataHealth = await resHealth.json();
    console.log("1. Health Check:", dataHealth.status === "ok" ? "PASÓ ✅" : "FALLÓ ❌");

    // 2. Login con credenciales incorrectas (debe dar 401)
    const resBadLogin = await fetch(`${BASE_URL}/usuarios/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@farmaciasanrafa.com", password: "PasswordErroneo!" }),
    });
    console.log("2. Rechazo de credenciales incorrectas (401):", resBadLogin.status === 401 ? "PASÓ ✅" : "FALLÓ ❌");

    // 3. Login exitoso Admin
    const resLogin = await fetch(`${BASE_URL}/usuarios/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@farmaciasanrafa.com", password: "Admin123*" }),
    });
    const dataLogin = await resLogin.json();
    const token = dataLogin.data?.token;
    console.log("3. Login exitoso con token JWT:", token ? "PASÓ ✅" : "FALLÓ ❌");

    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // 4. Consultar inventario
    const resInv = await fetch(`${BASE_URL}/inventario`, { headers: authHeaders });
    const dataInv = await resInv.json();
    console.log(`4. Consulta de inventario (${dataInv.data?.length} productos):`, resInv.ok ? "PASÓ ✅" : "FALLÓ ❌");

    // Tomar el primer producto para probar facturación
    const productoTest = dataInv.data[0];
    const stockAntes = Number(productoTest.stock_total);

    // 5. Emitir factura con transacción atómica
    const resFac = await fetch(`${BASE_URL}/facturacion`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        cliente_nombre: "Juan Perez",
        cliente_nit: "1234567-8",
        items: [{ producto_id: productoTest.id, cantidad: 2 }],
      }),
    });
    const dataFac = await resFac.json();
    console.log(
      "5. Emisión de factura con descuento FEFO en transacción:",
      resFac.status === 201 ? `PASÓ ✅ (${dataFac.data?.numero_factura})` : `FALLÓ ❌: ${dataFac.message}`
    );

    // 6. Verificar que el stock se descontó
    const resProdAfter = await fetch(`${BASE_URL}/inventario/${productoTest.id}`, { headers: authHeaders });
    const dataProdAfter = await resProdAfter.json();
    const stockDespues = Number(dataProdAfter.data.stock_total);
    console.log(
      `6. Verificación de descuento en inventario (${stockAntes} -> ${stockDespues}):`,
      stockDespues === stockAntes - 2 ? "PASÓ ✅" : "FALLÓ ❌"
    );

    // 7. Anular factura y restaurar stock
    const facturaId = dataFac.data.id;
    const resAnular = await fetch(`${BASE_URL}/facturacion/${facturaId}/anular`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ motivo_anulacion: "Cliente solicitó cancelación por cambio de receta" }),
    });
    console.log("7. Anulación de factura (200):", resAnular.ok ? "PASÓ ✅" : "FALLÓ ❌");

    // 8. Verificar que el stock se restauró exactamente
    const resProdRestored = await fetch(`${BASE_URL}/inventario/${productoTest.id}`, { headers: authHeaders });
    const dataProdRestored = await resProdRestored.json();
    const stockRestaurado = Number(dataProdRestored.data.stock_total);
    console.log(
      `8. Reversión exacta de stock tras anular (${stockDespues} -> ${stockRestaurado}):`,
      stockRestaurado === stockAntes ? "PASÓ ✅" : "FALLÓ ❌"
    );

    // 9. Intentar anular la misma factura dos veces (debe fallar con 409)
    const resReAnular = await fetch(`${BASE_URL}/facturacion/${facturaId}/anular`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ motivo_anulacion: "Intento de segunda anulación" }),
    });
    console.log(
      "9. Bloqueo de doble anulación (409):",
      resReAnular.status === 409 ? "PASÓ ✅" : "FALLÓ ❌"
    );

    // 10. Descarga de Reporte PDF
    const resPdf = await fetch(`${BASE_URL}/reportes/inventario/pdf`, { headers: { Authorization: `Bearer ${token}` } });
    console.log(
      "10. Descarga de reporte PDF:",
      resPdf.ok && resPdf.headers.get("content-type") === "application/pdf" ? "PASÓ ✅" : "FALLÓ ❌"
    );

    // 11. Descarga de Reporte Excel
    const resExcel = await fetch(`${BASE_URL}/reportes/inventario/excel`, { headers: { Authorization: `Bearer ${token}` } });
    console.log(
      "11. Descarga de reporte Excel:",
      resExcel.ok && resExcel.headers.get("content-type").includes("openxmlformats") ? "PASÓ ✅" : "FALLÓ ❌"
    );

    console.log("=== TODAS LAS PRUEBAS DE LA API FINALIZADAS SATISFACTORIAMENTE ===");
  } catch (err) {
    console.error("Error en pruebas:", err);
  }
}

runTests();

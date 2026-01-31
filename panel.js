const nextId = async () => {
    const lastId = (Math.random() * 100000).toFixed();
    const newId = lastId + 1;
    // await chrome.storage.local.set({ lastId: newId });
    return Number(newId);
};

const q = (sel) => document.querySelector(sel);
const byId = (id) => document.getElementById(id);

async function refreshTable() {
    let rules = await chrome.declarativeNetRequest.getDynamicRules();
    if (!rules) rules = [];
    const tbody = byId("rulesTable");
    tbody.innerHTML = "";
    for (const r of rules) {
        const tr = document.createElement("tr");
        const header = r.action.requestHeaders?.[0] ||
            r.action.responseHeaders?.[0] || { header: "-", operation: "-" };
        tr.innerHTML = `
      <td>${r.id}</td>
      <td><code>${r.condition.urlFilter || ""}</code></td>
	  <td><code>${(r.condition.resourceTypes || []).join(" | ")}</code></td>
      <td>${header.header} <small class="muted">(${header.operation}${
            header.value ? ` → ${header.value}` : ""
        })</small></td>
      <td>${r.action.type}</td>
      <td><button data-id="${r.id}" class="remove">Remover</button></td>
    `;
        tbody.appendChild(tr);
    }
    tbody.querySelectorAll("button.remove").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = Number(btn.dataset.id);
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [id],
            });
            refreshTable();
        });
    });
}

byId("addRule").addEventListener("click", async () => {
    const urlFilter = byId("urlFilter").value.trim();
    const resourceTypes = Array.from(byId("resourceTypes").selectedOptions).map(
        (o) => o.value
    );
    const headerName = byId("headerName").value.trim();
    const operation = byId("operation").value;
    const headerValue = byId("headerValue").value;

    if (!urlFilter || !headerName) {
        alert("Preencha urlFilter e headerName.");
        return;
    }

    const id = await nextId();

    const action = {
        type: "modifyHeaders",
        requestHeaders: [
            {
                header: headerName,
                operation,
                value: operation === "remove" ? undefined : headerValue,
            },
        ],
    };

    const rule = {
        id,
        priority: 1,
        action,
        condition: { urlFilter, resourceTypes },
    };

    await chrome.declarativeNetRequest.updateDynamicRules({ addRules: [rule] });
    refreshTable();
});

byId("clearRules").addEventListener("click", async () => {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    if (rules && rules.length) {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: rules.map((r) => r.id),
        });
    }
    refreshTable();
});

// Carrega domínios úteis (aba atual) como atalho
(async () => {
    // Sugere um filtro de URL baseado na aba inspecionada
    try {
        const tabs = await chrome.tabs.query({
            active: true,
        });

        const sortedTabs = tabs.sort((x, z) => z.lastAccessed - x.lastAccessed);

        const url = sortedTabs[0]?.url;
        if (url) {
            try {
                const u = new URL(url);
                byId("urlFilter").value = `*://${u.host}/*`;
            } catch {}
        }
    } catch {}

    refreshTable();
})();

"use strict";
self.onmessage = async (event) => {
    if (event.data.action === "refreshToken") {
        try {
            const response = await fetch("/api/refresh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken: event.data.refreshToken }),
            });
            if (!response.ok)
                throw new Error("Refresh échoué");
            const { jwt, newRefreshToken } = await response.json();
            postMessage({ status: "success", jwt, refreshToken: newRefreshToken });
        }
        catch (error) {
            postMessage({ status: "error", message: extractErrorMessage(error) });
        }
    }
};
// ✅ Fonction pour extraire un message d'erreur proprement
function extractErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return "Une erreur inconnue est survenue.";
}

//distance.controller.js
export const getDistance = async (req, res, next) => {
  const { points } = req.body;

  try {
    if (!points || points.length < 2)
      return res.status(400).json({ error: "Se requieren al menos 2 puntos" });

    if (!process.env.ORS_API_KEY) {
      console.error("ORS_API_KEY no está configurada");
      return res.status(500).json({ error: "Servicio de geolocalización no disponible" });
    }
    
    const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
        method: "POST",
        headers: {
          "Authorization": process.env.ORS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          coordinates: points
        })
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || `Error de OpenRouteService: ${response.status}`;
      return res.status(response.status >= 500 ? 502 : 400).json({ error: message });
    }
    
    const data = await response.json();

    const distance = data.routes?.[0]?.summary?.distance;

    if (!distance) {
      return res.status(500).json({ error: "No se pudo calcular distancia" });
    }

    res.json({
      distance_meters: parseFloat(distance),
      distance_km: parseFloat((distance / 1000).toFixed(2))
    });

  } catch (error) {
    next(error);
  }
};
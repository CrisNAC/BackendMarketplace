export const getDistance = async (req, res, next) => {
  const { points } = req.body;

  try {
    if (!points || points.length < 2)
      return res.status(400).json({ error: "Se requieren al menos 2 puntos" });

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

    const data = await response.json();

    const distance = data.routes?.[0]?.summary?.distance;

    if (!distance) {
      return res.status(500).json({ error: "No se pudo calcular distancia" });
    }

    res.json({
      distance_meters: distance,
      distance_km: (distance / 1000).toFixed(2)
    });

  } catch (error) {
    next(error);
  }
};
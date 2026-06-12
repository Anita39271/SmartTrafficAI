import { autocompleteAddress, buildGeoapifyRoute } from "../services/mapService.js";

export async function autocomplete(req, res, next) {
  try {
    const text = req.query.text;
    if (!text || String(text).trim().length < 3) return res.json({ suggestions: [] });
    const suggestions = await autocompleteAddress(text);
    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
}

export async function route(req, res, next) {
  try {
    const routes = await buildGeoapifyRoute(req.body);
    res.json({ routes });
  } catch (error) {
    next(error);
  }
}

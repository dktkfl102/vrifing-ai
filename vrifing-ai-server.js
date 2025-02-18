const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const API_KEY = "VmfbKY3w6GCH4NnyPPLa-8WBFHf3z-jd9aD3DX3stMo";
const BASE_URL = "https://node.apiopenperplex.com/custom_search";

function generateUniqueId() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const randomLetters =
    letters[Math.floor(Math.random() * 26)] +
    letters[Math.floor(Math.random() * 26)];
  const randomNumbers = Math.floor(
    1000000 + Math.random() * 9000000
  ).toString();
  return randomLetters + randomNumbers;
}

app.get("/fetch-data", async (req, res) => {
  try {
    const { store, region } = req.query;
    if (!store || !region) {
      return res
        .status(400)
        .json({ error: "Missing required query parameters: store or region" });
    }

    const systemPrompt = `When searching for store information requested by the user, use the search query in the format 'region name + store name' 
    and search on Naver first. 
    If the information is incomplete or unavailable on Naver, then search on Google as a secondary option. 
    Provide the results in the following JSON format: { 
        "store_name": "Store Name", 
        "store_image": "Store Image URL", 
        "address_jibun": "Lot Number Address", 
        "address_road": "Road Name Address", 
        "store_phone": ["Phone Number", "Phone Number"], 
        "store_location": { 
            "latitude": "Latitude",
            "longitude": "Longitude"
        }, 
        "categories": [ 
            { 
                "category": "Primary Category", 
                "business_primary_tag": "Primary Business Tag", 
                "business_secondary_tag": "Secondary Business Tag" 
            } 
        ], 
        "regions": [ 
            { 
                "region_primary": "Primary Region", 
                "region_secondary": "Secondary Region", 
                "region_tertiary": "Tertiary Region" 
            } 
        ], 
        "store_hours": "Operating Hours", 
        "is_closed": true/false, 
        "menu": [ 
            { 
                "name": "Menu Item", 
                "price": Price, 
                "order": Order Number 
            } 
        ] 
    } 
    For store_phone, display up to two phone numbers from the Naver blog.
    For store_hours, display Monday to Sunday (월, 화, 수, 목, 금, 토, 일), including break time if applicable.
    For latitude and longitude, infer the values based on the provided address. 
    If some information cannot be found, leave other fields empty. However, always provide estimated latitude and longitude values based on the address.
    If no information is found at all, simply respond with { "error": "Information not available" }.`;

    const userPrompt = `region name: ${region}, store name: ${store} 딱 obj만 내려줘 앞뒤 설명 넣지 말고`;

    const params = {
      system_prompt: systemPrompt,
      user_prompt: userPrompt,
      location: "ko",
      model: "gpt-4o-mini",
      temperature: "0.7",
    };

    const response = await axios.post(`${BASE_URL}`, params, {
      headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
    });

    let result = response.data.llm_response;
    console.log(result);

    if (typeof result === "string") {
      result = result.trim();
      const firstBrace = result.indexOf("{");
      const lastBrace = result.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        result = result.substring(firstBrace, lastBrace + 1);
      }
      try {
        result = JSON.parse(result);
        if (!result.error) {
          result.store_id = generateUniqueId();
        }

        res.json(result);
      } catch (err) {
        console.error("Invalid JSON response:", result);
        return res
          .status(500)
          .json({ error: "Invalid JSON response from external API" });
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

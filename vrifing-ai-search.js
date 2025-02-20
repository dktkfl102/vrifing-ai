const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const API_KEY = "VmfbKY3w6GCH4NnyPPLa-8WBFHf3z-jd9aD3DX3stMo";
const BASE_URL = "https://node.apiopenperplex.com/custom_search";
const QUERY_FROM_URL = "https://node.apiopenperplex.com/query_from_url";

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

    let result = hasKorean(store, region)
      ? await queryFromUrl(store, region)
      : await customSearch(store, region);
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

const customSearch = async (store, region) => {
  const params = {
    system_prompt:
      `When searching for store information requested by the user, use the search query in the format 'region name + store name' 
            and search on Naver first. ` + systemPrompt,
    user_prompt: userPrompt(store, region),
    location: "ko",
    model: "gpt-4o-mini",
    temperature: "0.7",
  };

  try {
    const response = await axios.post(`${BASE_URL}`, params, {
      headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
    });
    return response.data.llm_response;
  } catch (e) {
    return new Error("Error Custom Search");
  }
};

const queryFromUrl = async (store, region) => {
  const params = {
    url: `https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=${store}+${region}`,
    // url: `https://www.google.com/search&q=${store}+${region}`,
    query: systemPrompt + userPrompt(store, region),
    response_language: "ko",
  };

  try {
    const response = await axios.get(`${QUERY_FROM_URL}`, {
      params: params,
      headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
    });
    return response.data.llm_response;
  } catch (e) {
    return new Error("Error Custom Search" + e);
  }
};

const hasKorean = (store, region) => {
  const koreanRegex = /[ㄱ-ㅎㅏ-ㅣ가-힣]/;
  return koreanRegex.test(store) || koreanRegex.test(region);
};

const systemPrompt = `
1. Look for the newest articles.
2. 검색된 정보는 다음 JSON 형식으로 제공하세요:  { 
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
    "is_closed": true/false(means closed down), 
    "menu": [ 
        { 
            "name": "Menu Item", 
            "price": Price, 
            "order": Order Number 
        } 
    ] 
} 

### 📌 'store_hours' 규칙
1. 월, 화, 수, 목, 금, 토, 일 순서대로 각 요일별로 제공하며(같은 시간이라도 한번에 표기 X), 브레이크 타임 포함.  
2. 특정 요일이 휴무일이면 "휴무"로 표시.  
3. 24시간 영업이면 "00:00-24:00"으로 표기.  
4. 각 요일 구분은 쉼표(,)로 표기.  
5. 브레이크타임/라스트오더 가 있는 경우 앞에서 세칸 띄어쓰기해서 표기.

### 📌 'store_phone'
- 결과 값에 띄어쓰기가 있다면, 띄어쓰기 대신 하이픈(-)을 넣어주세요.

### 📌 'latitude', 'longitude'
- 정보가 없다면, 주소 정보를 기반으로 추정하여 반드시 제공하세요.

### 📌 'menu'
- 결과의 'address_jibun' 혹은 'address_road'가 한국 외의 장소라면 빈 배열로 내려주세요.

### 📌 'menu.price'
- 가격은 1,000 단위마다 콤마를 추가하고 "원"을 붙이세요.

### 📌 정보 부족 시 처리 방법
- 정보가 없을 경우 해당 필드는 비워둡니다.  
- 주소 기반 'latitude'와 'longitude' 값은 반드시 제공하세요.  
- 검색된 정보가 전혀 없으면 '{ "error": "Information not available" }'를 반환하세요.
 `;

const userPrompt = (store, region) =>
  `region name: ${region}, store name: ${store}. Look for the newest articles.`;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

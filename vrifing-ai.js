const options = {
  method: "GET",
  headers: { "X-API-Key": "4-IuLFBFMG6yGsC-pUzuIm_1gLc0hwP7RUi1MNircew" },
};

const params = new URLSearchParams({
  url: "https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=%ED%95%98%EB%82%A8+%EB%A7%98%EB%A7%88",
  query:
    "하남미사에 있는 용두동쭈꾸미 라는 매장의 정보를 지번 주소,도로명주소,전화번호,위치정보,영업시간,메뉴 정도의 정보를 확인해볼수있을까요? 메뉴와 가격에 대해서는 더 자세하게 알려주세요",
}).toString();

fetch(
  `https://44c57909-d9e2-41cb-9244-9cd4a443cb41.app.bhs.ai.cloud.ovh.net/query_from_url?${params}`,
  options
)
  .then((response) => response.json())
  .then((response) => console.log(response))
  .catch((err) => console.error(err));

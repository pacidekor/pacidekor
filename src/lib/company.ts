export const COMPANY = {
  name: "PACIDEKOR s.r.o.",
  address: "Kráľová nad Váhom 283, 925 91",
  addressFull: "Kráľová nad Váhom 283, 925 91, Slovenská republika",
  email: "info@pacidekor.sk",
  phone: "+421 910 592 948",
  ico: "47419679",
  dic: "2023925178",
  icDph: "SK2023925178",
  registry:
    "Obchodný register Okresného súdu Trnava, oddiel: Sro, vložka č. 33076/T",
} as const;

export const COMPANY_IDENTIFICATION_ITEMS = [
  `Sídlo: ${COMPANY.addressFull}`,
  `E-mail: ${COMPANY.email}`,
  `Telefón: ${COMPANY.phone}`,
  `IČO: ${COMPANY.ico}`,
  `DIČ: ${COMPANY.dic}`,
  `IČ DPH: ${COMPANY.icDph}`,
  `Zapísaná v: ${COMPANY.registry}`,
] as const;

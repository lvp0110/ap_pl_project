export type Contact = {
  organization: string
  person: string
  contact: string
}

export type MaterialLine = {
  article: string
  name: string
  quantity: number | null
  unit: string
  color: string
  note: string
}

export type PriceItem = {
  id: string
  article: string
  name: string
  price: number
  priceUnit: string
  qtyUnit: string
  label: string
}

export type Project = {
  id: string
  applicationNumber: string
  composedDay: string
  composedMonth: string
  composedYear: string
  reservationStatus: string
  reservationDate: string
  source: string
  name: string
  city: string
  street: string
  house: string
  purpose: string
  stage: string
  deliveryMonth: string
  deliveryYear: string
  probability: string
  managerAG: string
  contacts: {
    customer: Contact
    designer: Contact
    gc: Contact
    sub: Contact
  }
  firstContactDay: string
  firstContactMonth: string
  firstContactYear: string
  presentation: string
  variantDesign: string
  installScheme: string
  specification: string
  materials: MaterialLine[]
  updatedAt: string
  updatedBy: string
  partnerNote: string
}

export type Catalogs = {
  sources: string[]
  purposes: string[]
  stages: string[]
  probabilities: string[]
  units: string[]
  reservationStatuses: string[]
  months: string[]
  years: string[]
  deliveryYears: string[]
  days: string[]
  managersAG: string[]
  priorities: string[]
  regions: string[]
  documentationTypes: string[]
  managersSG: string[]
}


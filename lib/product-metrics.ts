import { Product, ProductMetricType, SalesRecord } from "@/types/models"

type ProductMetricSource = Partial<Pick<Product, "name" | "type" | "metric_type" | "unit_label">>

type ProductMetricValueSource = Partial<Pick<SalesRecord, "source_type" | "metric_value" | "amount" | "quantity" | "unit_label" | "metric_type">> & {
  result_value?: number | string | null
}

export function getProductMetricDefinition(product?: ProductMetricSource | null): { metricType: ProductMetricType; unitLabel: string } {
  const explicitMetricType = typeof product?.metric_type === "string" ? product.metric_type.toUpperCase() : ""
  const explicitUnitLabel = product?.unit_label?.trim()

  if ((explicitMetricType === "QUANTITY" || explicitMetricType === "AMOUNT") && explicitUnitLabel) {
    return {
      metricType: explicitMetricType as ProductMetricType,
      unitLabel: explicitUnitLabel,
    }
  }

  const upperName = `${product?.name || ""}`.toUpperCase()
  const upperType = `${product?.type || ""}`.toUpperCase()

  if (upperName.includes("BẢO HIỂM") || upperType === "BẢO HIỂM" || upperName.includes("BH ") || upperName.includes("LIFE")) {
    return { metricType: "AMOUNT", unitLabel: "Triệu đồng" }
  }

  if (upperName.includes("HUY ĐỘNG") || upperType === "HUY ĐỘNG VỐN") {
    return { metricType: "AMOUNT", unitLabel: "Tỷ đồng" }
  }

  if (upperName.includes("DƯ NỢ")) {
    return { metricType: "AMOUNT", unitLabel: "Tỷ đồng" }
  }

  if (
    upperName.includes("HMTD") ||
    upperName.includes("CIF") ||
    upperName.includes("DIRECT") ||
    upperName.includes("SMARTBANKING") ||
    upperType === "TÀI KHOẢN" ||
    upperType === "SMARTBANKING"
  ) {
    return { metricType: "QUANTITY", unitLabel: "KH" }
  }

  return {
    metricType: explicitMetricType === "AMOUNT" ? "AMOUNT" : "QUANTITY",
    unitLabel: explicitUnitLabel || "SL",
  }
}

export function getProductMetricValue(source?: ProductMetricValueSource | null, product?: ProductMetricSource | null): number {
  const directMetricValue = Number(source?.metric_value ?? Number.NaN)
  if (Number.isFinite(directMetricValue)) {
    return directMetricValue
  }

  const resultValue = Number(source?.result_value ?? Number.NaN)
  if (Number.isFinite(resultValue)) {
    return resultValue
  }

  const { metricType } = getProductMetricDefinition(product || source)

  if (metricType === "AMOUNT") {
    const amount = Number(source?.amount ?? 0)
    return Number.isFinite(amount) ? amount : 0
  }

  const quantity = Number(source?.quantity ?? 0)
  return Number.isFinite(quantity) ? quantity : 0
}

export function getRecordMetricValue(record?: Partial<SalesRecord> | null): number {
  if (!record) return 0

  if (record.source_type === "PRODUCT") {
    return getProductMetricValue(record)
  }

  const metricValue = Number(record.metric_value ?? record.amount ?? 0)
  return Number.isFinite(metricValue) ? metricValue : 0
}

export function getRecordUnitLabel(record?: Partial<SalesRecord> | null): string {
  if (!record) return ""

  if (record.source_type === "PRODUCT") {
    return getProductMetricDefinition(record).unitLabel
  }

  return record.unit_label || "VNĐ"
}

export function formatMetricNumber(value: number): string {
  const normalizedValue = Number(value || 0)
  const hasFraction = Math.abs(normalizedValue % 1) > 0.0001

  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(normalizedValue)
}

export function formatMetricValue(value: number, unitLabel?: string | null): string {
  const suffix = unitLabel?.trim()
  return `${formatMetricNumber(value)}${suffix ? ` ${suffix}` : ""}`
}

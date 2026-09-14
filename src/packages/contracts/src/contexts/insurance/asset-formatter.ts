export interface AssetFormatInput {
  properties?: Record<string, any> | null;
  assetTypeName?: string | null;
  assetTypeCode?: string | null;
}

/**
 * Formats a readable summary for an insurance asset.
 * Prioritizes vehicles (brand, model, license plate, year),
 * real estate / locations (address), or falls back to the asset type name or '-'.
 */
export function formatAssetDescription(asset?: AssetFormatInput | null): string {
  if (!asset || !asset.properties || typeof asset.properties !== 'object') {
    return asset?.assetTypeName || asset?.assetTypeCode || '-';
  }
  const props = asset.properties;
  const brand = props.marca || props.brand || '';
  const model = props.modelo || props.model || '';
  const plate = props.patente || props.plate || props.dominio || '';
  const year = props.anio || props.ano || props.year || '';

  if (brand || model || plate) {
    const parts = [brand, model].filter(Boolean).join(' ');
    const extra = [plate ? `(${plate})` : '', year ? `${year}` : ''].filter(Boolean).join(' ');
    const res = [parts, extra].filter(Boolean).join(' ').trim();
    if (res) return res;
  }

  const address = props.direccion || props.ubicacion || props.address || props.location || '';
  if (address) {
    return String(address).trim();
  }

  const desc = props.descripcion || props.description || props.nombre || '';
  if (desc) {
    return String(desc).trim();
  }

  return asset.assetTypeName || asset.assetTypeCode || '-';
}

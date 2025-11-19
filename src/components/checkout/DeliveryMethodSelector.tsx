'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import PhoneNumberField from '@/components/forms/PhoneNumberField'

export type DeliveryMethod = 'pickup' | 'courier'

export type DeliveryFormData = {
  deliveryMethod: DeliveryMethod
  // For courier
  shippingRegion?: string
  shippingCommune?: string
  shippingAddressLine1?: string
  shippingAddressLine2?: string
  shippingCity?: string
  shippingPostalCode?: string
  shippingInstructions?: string
  // For pickup
  pickupNotes?: string
  // Contact info
  firstName?: string
  lastName?: string
  contactPhone?: string
  // Email (for guest checkout, especially pickup)
  email?: string
}

// Chilean regions list
const CHILEAN_REGIONS = [
  { value: 'Región Metropolitana', label: 'Región Metropolitana (RM)' },
  { value: 'Región de Arica y Parinacota', label: 'Región de Arica y Parinacota' },
  { value: 'Región de Tarapacá', label: 'Región de Tarapacá' },
  { value: 'Región de Antofagasta', label: 'Región de Antofagasta' },
  { value: 'Región de Atacama', label: 'Región de Atacama' },
  { value: 'Región de Coquimbo', label: 'Región de Coquimbo' },
  { value: 'Región de Valparaíso', label: 'Región de Valparaíso' },
  { value: 'Región del Libertador General Bernardo O\'Higgins', label: 'Región de O\'Higgins' },
  { value: 'Región del Maule', label: 'Región del Maule' },
  { value: 'Región de Ñuble', label: 'Región de Ñuble' },
  { value: 'Región del Biobío', label: 'Región del Biobío' },
  { value: 'Región de La Araucanía', label: 'Región de La Araucanía' },
  { value: 'Región de Los Ríos', label: 'Región de Los Ríos' },
  { value: 'Región de Los Lagos', label: 'Región de Los Lagos' },
  { value: 'Región de Aysén', label: 'Región de Aysén' },
  { value: 'Región de Magallanes', label: 'Región de Magallanes' },
]

// Mapping of regions to communes (all sorted alphabetically)
const REGION_COMMUNES: Record<string, string[]> = {
  'Región Metropolitana': [
    'Alhué', 'Buin', 'Calera de Tango', 'Cerrillos', 'Cerro Navia', 'Colina', 'Conchalí',
    'Curacaví', 'El Bosque', 'El Monte', 'Estación Central', 'Huechuraba', 'Independencia',
    'Isla de Maipo', 'La Cisterna', 'La Florida', 'La Granja', 'La Pintana', 'La Reina',
    'Lampa', 'Las Condes', 'Lo Barnechea', 'Lo Espejo', 'Lo Prado', 'Macul', 'Maipú',
    'María Pinto', 'Melipilla', 'Padre Hurtado', 'Paine', 'Peñaflor', 'Peñalolén', 'Pirque',
    'Providencia', 'Puente Alto', 'Pudahuel', 'Quilicura', 'Quinta Normal', 'Recoleta',
    'Renca', 'San Bernardo', 'San Joaquín', 'San José de Maipo', 'San Miguel', 'San Pedro',
    'San Ramón', 'Santiago', 'Talagante', 'Tiltil', 'Vitacura', 'Ñuñoa'
  ],
  'Región de Arica y Parinacota': [
    'Arica', 'Camarones', 'General Lagos', 'Putre'
  ],
  'Región de Tarapacá': [
    'Alto Hospicio', 'Camiña', 'Colchane', 'Huara', 'Iquique', 'Pica', 'Pozo Almonte'
  ],
  'Región de Antofagasta': [
    'Antofagasta', 'Calama', 'María Elena', 'Mejillones', 'Ollagüe', 'San Pedro de Atacama',
    'Sierra Gorda', 'Taltal', 'Tocopilla'
  ],
  'Región de Atacama': [
    'Alto del Carmen', 'Caldera', 'Chañaral', 'Copiapó', 'Diego de Almagro', 'Freirina',
    'Huasco', 'Tierra Amarilla', 'Vallenar'
  ],
  'Región de Coquimbo': [
    'Andacollo', 'Canela', 'Combarbalá', 'Coquimbo', 'Illapel', 'La Higuera', 'La Serena',
    'Los Vilos', 'Monte Patria', 'Ovalle', 'Paiguano', 'Punitaqui', 'Río Hurtado',
    'Salamanca', 'Vicuña'
  ],
  'Región de Valparaíso': [
    'Algarrobo', 'Cabildo', 'Calle Larga', 'Cartagena', 'Catemu', 'Concón', 'El Quisco',
    'El Tabo', 'Hijuelas', 'La Calera', 'La Cruz', 'La Ligua', 'Limache', 'Llaillay',
    'Los Andes', 'Nogales', 'Olmué', 'Panquehue', 'Papudo', 'Petorca', 'Puchuncaví',
    'Putaendo', 'Quilpué', 'Quillota', 'Quintero', 'Rinconada', 'San Antonio', 'San Esteban',
    'San Felipe', 'Santa María', 'Santo Domingo', 'Valparaíso', 'Villa Alemana', 'Viña del Mar',
    'Zapallar'
  ],
  'Región del Libertador General Bernardo O\'Higgins': [
    'Chépica', 'Chimbarongo', 'Codegua', 'Coinco', 'Coltauco', 'Doñihue', 'Graneros', 'La Estrella',
    'Las Cabras', 'Litueche', 'Lolol', 'Machalí', 'Malloa', 'Marchihue', 'Mostazal', 'Nancagua',
    'Navidad', 'Olivar', 'Palmilla', 'Paredones', 'Peralillo', 'Peumo', 'Pichidegua', 'Pichilemu',
    'Placilla', 'Pumanque', 'Quinta de Tilcoco', 'Rancagua', 'Rengo', 'Requínoa', 'San Fernando',
    'San Vicente', 'Santa Cruz'
  ],
  'Región del Maule': [
    'Cauquenes', 'Chanco', 'Colbún', 'Constitución', 'Curepto', 'Curicó', 'Empedrado', 'Hualañé',
    'Licantén', 'Linares', 'Longaví', 'Maule', 'Molina', 'Parral', 'Pelarco', 'Pelluhue',
    'Pencahue', 'Rauco', 'Retiro', 'Río Claro', 'Romeral', 'Sagrada Familia', 'San Clemente',
    'San Javier', 'San Rafael', 'Talca', 'Teno', 'Vichuquén', 'Villa Alegre', 'Yerbas Buenas'
  ],
  'Región de Ñuble': [
    'Bulnes', 'Chillán', 'Chillán Viejo', 'Cobquecura', 'Coelemu', 'Coihueco', 'El Carmen',
    'Ninhue', 'Ñiquén', 'Pemuco', 'Pinto', 'Portezuelo', 'Quillón', 'Quirihue', 'Ránquil',
    'San Carlos', 'San Fabián', 'San Ignacio', 'San Nicolás', 'Treguaco', 'Yungay'
  ],
  'Región del Biobío': [
    'Alto Biobío', 'Antuco', 'Arauco', 'Cabrero', 'Cañete', 'Chiguayante', 'Concepción',
    'Contulmo', 'Coronel', 'Curanilahue', 'Florida', 'Hualpén', 'Hualqui', 'Laja', 'Lautaro',
    'Lebu', 'Los Álamos', 'Los Ángeles', 'Lota', 'Mulchén', 'Nacimiento', 'Negrete', 'Penco',
    'Quilaco', 'Quilleco', 'San Pedro de la Paz', 'San Rosendo', 'Santa Bárbara', 'Santa Juana',
    'Talcahuano', 'Tirúa', 'Tomé', 'Tucapel', 'Yumbel'
  ],
  'Región de La Araucanía': [
    'Angol', 'Carahue', 'Cholchol', 'Collipulli', 'Cunco', 'Curacautín', 'Curarrehue', 'Ercilla',
    'Freire', 'Galvarino', 'Gorbea', 'Lautaro', 'Lonquimay', 'Loncoche', 'Los Sauces', 'Lumaco',
    'Melipeuco', 'Nueva Imperial', 'Padre las Casas', 'Perquenco', 'Pitrufquén', 'Pucón', 'Purén',
    'Renaico', 'Saavedra', 'Temuco', 'Teodoro Schmidt', 'Toltén', 'Traiguén', 'Victoria',
    'Vilcún', 'Villarrica'
  ],
  'Región de Los Ríos': [
    'Corral', 'Futrono', 'Lago Ranco', 'Lanco', 'Los Lagos', 'La Unión', 'Máfil', 'Mariquina',
    'Paillaco', 'Panguipulli', 'Río Bueno', 'Valdivia'
  ],
  'Región de Los Lagos': [
    'Ancud', 'Calbuco', 'Castro', 'Chaitén', 'Cochamó', 'Curaco de Vélez', 'Dalcahue', 'Fresia',
    'Frutillar', 'Futaleufú', 'Hualaihué', 'Llanquihue', 'Los Muermos', 'Maullín', 'Osorno',
    'Palena', 'Puerto Montt', 'Puerto Octay', 'Puerto Varas', 'Puqueldón', 'Purranque', 'Puyehue',
    'Queilén', 'Quellón', 'Quemchi', 'Quinchao', 'Río Negro', 'San Juan de la Costa', 'San Pablo',
    'Chonchi'
  ],
  'Región de Aysén': [
    'Aysén', 'Chile Chico', 'Cisnes', 'Cochrane', 'Coyhaique', 'Guaitecas', 'Lago Verde',
    'O\'Higgins', 'Río Ibáñez', 'Tortel'
  ],
  'Región de Magallanes': [
    'Antártica', 'Cabo de Hornos', 'Laguna Blanca', 'Natales', 'Porvenir', 'Primavera',
    'Punta Arenas', 'Río Verde', 'San Gregorio', 'Timaukel', 'Torres del Paine'
  ],
}

// Helper function to get communes for a region (already sorted alphabetically)
function getCommunesForRegion(region: string | undefined): string[] {
  if (!region) return []
  return REGION_COMMUNES[region] || []
}

interface DeliveryMethodSelectorProps {
  value: DeliveryFormData
  onChange: (data: DeliveryFormData) => void
  shippingCost?: number
  isGuest?: boolean // Whether the user is a guest (not authenticated)
}

export default function DeliveryMethodSelector({
  value,
  onChange,
  shippingCost,
  isGuest = false,
}: DeliveryMethodSelectorProps) {
  const t = useTranslations()
  const [localData, setLocalData] = useState<DeliveryFormData>(value)

  const updateField = (field: keyof DeliveryFormData, fieldValue: any) => {
    const newData = { ...localData, [field]: fieldValue }
    setLocalData(newData)
    onChange(newData)
  }

  const setDeliveryMethod = (method: DeliveryMethod) => {
    const newData: DeliveryFormData = {
      ...localData,
      deliveryMethod: method,
      // Clear courier fields if switching to pickup
      ...(method === 'pickup' ? {
        shippingRegion: undefined,
        shippingCommune: undefined,
        shippingAddressLine1: undefined,
        shippingAddressLine2: undefined,
        shippingCity: undefined,
        shippingPostalCode: undefined,
        shippingInstructions: undefined,
      } : {
        pickupNotes: undefined,
      }),
    }
    setLocalData(newData)
    onChange(newData)
  }

  // Clear commune when region changes
  const handleRegionChange = (region: string) => {
    const newData: DeliveryFormData = {
      ...localData,
      shippingRegion: region,
      shippingCommune: undefined, // Clear commune when region changes
    }
    setLocalData(newData)
    onChange(newData)
  }

  return (
    <>
      <style>{`
        .delivery-form input::placeholder,
        .delivery-form textarea::placeholder {
          color: var(--mutedText);
          opacity: 0.7;
        }
      `}</style>
      <div className="mt-6 border rounded p-4 delivery-form" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-semibold mb-4">{t('checkout.delivery.method.label')}</h3>
      
      {/* Delivery Method Selection */}
      <div className="space-y-3 mb-6">
        {/* Pickup Option */}
        <label className="flex items-start gap-3 p-4 border rounded cursor-pointer hover:opacity-80 transition-opacity" style={{ 
          borderColor: localData.deliveryMethod === 'pickup' ? '#9B7BFF' : 'var(--border)',
          backgroundColor: localData.deliveryMethod === 'pickup' ? 'rgba(155, 123, 255, 0.05)' : 'transparent',
        }}>
          <input
            type="radio"
            name="deliveryMethod"
            value="pickup"
            checked={localData.deliveryMethod === 'pickup'}
            onChange={() => setDeliveryMethod('pickup')}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium mb-1">{t('checkout.delivery.pickup.title')}</div>
            <div className="text-sm" style={{ color: 'var(--mutedText)' }}>
              {t('checkout.delivery.pickup.description')}
            </div>
          </div>
        </label>

        {/* Courier Option */}
        <label className="flex items-start gap-3 p-4 border rounded cursor-pointer hover:opacity-80 transition-opacity" style={{ 
          borderColor: localData.deliveryMethod === 'courier' ? '#9B7BFF' : 'var(--border)',
          backgroundColor: localData.deliveryMethod === 'courier' ? 'rgba(155, 123, 255, 0.05)' : 'transparent',
        }}>
          <input
            type="radio"
            name="deliveryMethod"
            value="courier"
            checked={localData.deliveryMethod === 'courier'}
            onChange={() => setDeliveryMethod('courier')}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium mb-1">{t('checkout.delivery.courier.title')}</div>
            <div className="text-sm" style={{ color: 'var(--mutedText)' }}>
              {t('checkout.delivery.courier.description')}
            </div>
            {shippingCost !== undefined && shippingCost > 0 && (
              <div className="text-sm font-medium mt-1" style={{ color: '#9B7BFF' }}>
                {t('checkout.delivery.courier.cost', { cost: shippingCost.toLocaleString('es-CL') })}
              </div>
            )}
          </div>
        </label>
      </div>

      {/* Conditional Form Fields */}
      {localData.deliveryMethod === 'pickup' && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('checkout.delivery.contact.firstName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={localData.firstName || ''}
                onChange={(e) => updateField('firstName', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                style={{ borderColor: 'var(--border)' }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('checkout.delivery.contact.lastName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={localData.lastName || ''}
                onChange={(e) => updateField('lastName', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                style={{ borderColor: 'var(--border)' }}
                required
              />
            </div>
          </div>
          <PhoneNumberField
            value={localData.contactPhone}
            onChange={(value) => updateField('contactPhone', value || undefined)}
            label={t('checkout.delivery.contact.phone')}
            required={true}
            name="contactPhone-pickup"
          />
          {isGuest && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('checkout.email')} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={localData.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                style={{ borderColor: 'var(--border)' }}
                required
                placeholder={t('checkout.enterEmailForOrderSummary')}
                autoComplete="email"
              />
              <style jsx>{`
                input::placeholder {
                  color: var(--mutedText);
                  opacity: 0.7;
                }
              `}</style>
            </div>
          )}
        </div>
      )}

      {localData.deliveryMethod === 'courier' && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('checkout.delivery.contact.firstName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={localData.firstName || ''}
                onChange={(e) => updateField('firstName', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                style={{ borderColor: 'var(--border)' }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('checkout.delivery.contact.lastName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={localData.lastName || ''}
                onChange={(e) => updateField('lastName', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                style={{ borderColor: 'var(--border)' }}
                required
              />
            </div>
          </div>
          <PhoneNumberField
            value={localData.contactPhone}
            onChange={(value) => updateField('contactPhone', value || undefined)}
            label={t('checkout.delivery.contact.phone')}
            required={false}
            name="contactPhone-courier"
          />
          {isGuest && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('checkout.email')} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={localData.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                style={{ borderColor: 'var(--border)' }}
                required
                placeholder={t('checkout.enterEmailForOrderSummary')}
                autoComplete="email"
              />
              <style jsx>{`
                input::placeholder {
                  color: var(--mutedText);
                  opacity: 0.7;
                }
              `}</style>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('checkout.delivery.shipping.region')} <span className="text-red-500">*</span>
            </label>
            <select
              value={localData.shippingRegion || ''}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              style={{ borderColor: 'var(--border)' }}
              required
            >
              <option value="">{t('checkout.delivery.shipping.selectRegion')}</option>
              {CHILEAN_REGIONS.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('checkout.delivery.shipping.commune')} <span className="text-red-500">*</span>
            </label>
            <select
              key={`commune-${localData.shippingRegion || 'none'}`}
              value={localData.shippingCommune || ''}
              onChange={(e) => updateField('shippingCommune', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              style={{ borderColor: 'var(--border)' }}
              required
              disabled={!localData.shippingRegion}
            >
              <option value="">{t('checkout.delivery.shipping.selectCommune')}</option>
              {getCommunesForRegion(localData.shippingRegion).map((commune) => (
                <option key={commune} value={commune}>
                  {commune}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('checkout.delivery.shipping.addressLine1')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={localData.shippingAddressLine1 || ''}
              onChange={(e) => updateField('shippingAddressLine1', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              style={{ borderColor: 'var(--border)' }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('checkout.delivery.shipping.addressLine2')}
            </label>
            <input
              type="text"
              value={localData.shippingAddressLine2 || ''}
              onChange={(e) => updateField('shippingAddressLine2', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              style={{ borderColor: 'var(--border)' }}
              placeholder={t('checkout.delivery.shipping.addressLine2Placeholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('checkout.delivery.shipping.city')}
            </label>
            <input
              type="text"
              value={localData.shippingCity || ''}
              onChange={(e) => updateField('shippingCity', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              style={{ borderColor: 'var(--border)' }}
              placeholder={t('checkout.delivery.shipping.cityPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('checkout.delivery.shipping.postalCode')}
            </label>
            <input
              type="text"
              value={localData.shippingPostalCode || ''}
              onChange={(e) => updateField('shippingPostalCode', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              style={{ borderColor: 'var(--border)' }}
              placeholder={t('checkout.delivery.shipping.postalCodePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('checkout.delivery.shipping.instructions')}
            </label>
            <textarea
              value={localData.shippingInstructions || ''}
              onChange={(e) => updateField('shippingInstructions', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              style={{ borderColor: 'var(--border)' }}
              rows={2}
              placeholder={t('checkout.delivery.shipping.instructionsPlaceholder')}
            />
          </div>
        </div>
      )}
      </div>
    </>
  )
}


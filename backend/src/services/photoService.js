import { inputError } from '../../../shared/numbers.mjs'
export const MAX_PHOTO_BYTES=2*1024*1024
export function validatePhoto(buffer,type) {
  if(!Buffer.isBuffer(buffer)||buffer.length===0||buffer.length>MAX_PHOTO_BYTES)throw inputError('La foto debe pesar como máximo 2 MiB')
  const jpeg=buffer.length>3&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255
  const png=buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
  const webp=buffer.length>=12&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP'
  if(type==='image/jpeg'&&jpeg)return 'jpg'
  if(type==='image/png'&&png)return 'png'
  if(type==='image/webp'&&webp)return 'webp'
  throw inputError('Usa una foto JPEG, PNG o WebP válida; no se admite SVG')
}
export function photoUrl(input) {
  if(input===null||input==='')return null
  if(typeof input!=='string')throw inputError('La foto no es válida')
  try {const url=new URL(input);if(url.protocol!=='https:'||!url.pathname.includes('/storage/v1/object/public/product-photos/'))throw Error();return url.href}
  catch {throw inputError('Usa una foto cargada al catálogo')}
}

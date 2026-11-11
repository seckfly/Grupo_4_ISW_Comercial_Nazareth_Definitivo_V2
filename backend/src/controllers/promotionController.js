import { pool } from '../config/db.js'
import { Promotion } from '../models/Promotion.js'
import { validatePromotionInput } from '../services/promotionService.js'
export async function listPromotions(_req,res,next){try{res.json(await Promotion.list(pool))}catch(error){next(error)}}
export async function createPromotion(req,res,next){try{const validation=validatePromotionInput(req.body);if(!validation.valid)return res.status(400).json({message:validation.message});res.status(201).json(await Promotion.create(pool,{...req.body,userId:req.user.id}))}catch(error){next(error)}}
export async function updatePromotion(req,res,next){try{const validation=validatePromotionInput(req.body);if(!validation.valid)return res.status(400).json({message:validation.message});res.json(await Promotion.update(pool,req.params.id,req.body))}catch(error){next(error)}}
export async function updatePromotionStatus(req,res,next){try{if(!['active','scheduled','paused','finished'].includes(req.body.status))return res.status(400).json({message:'Estado no válido'});res.json(await Promotion.updateStatus(pool,req.params.id,req.body.status))}catch(error){next(error)}}
export async function deletePromotion(req,res,next){try{const removed=await Promotion.remove(pool,req.params.id);if(!removed)return res.status(404).json({message:'Promoción no encontrada'});res.status(204).end()}catch(error){next(error)}}

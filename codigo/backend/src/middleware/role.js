export const requireRole=(role)=>(req,res,next)=>req.user?.role===role?next():res.status(403).json({message:'No tienes permiso para realizar esta acción'})

import jwt from 'jsonwebtoken';

const authenticate = (req, res, next) => {

	const userToken = req.cookies.userToken; //Obtenemos la cookie con el token

	if(!userToken) {
		return res.status(401).json({
			errors: {
				auth: {
					message: 'No autenticado'
				}
			}
		}); //Enviamos el mensaje de error
	}

	jwt.verify(userToken, process.env.JWT_SECRET, (err, payload) => {
		if(err) {
			return res.status(401).json({
				errors: {
					auth: {
						messsage: 'No autenticado'
					}
				}
			});
		}
		//Si el token es valido, continuamos con el proceso
		req.user = payload;  //Se guarda el payload(id, etc.) en la peticion
		next();
	});
};

export default authenticate;
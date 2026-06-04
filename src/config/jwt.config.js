import jwt from 'jsonwebtoken';
import { isBlacklisted } from '../lib/tokenBlacklist.js';

const authenticate = (req, res, next) => {
	const userToken = req.cookies.userToken; 

	if (!userToken) {
		return res.status(401).json({
			errors: {
				auth: {
					message: 'No autenticado'
				}
			}
		});
	}

	jwt.verify(userToken, process.env.JWT_SECRET, (err, payload) => {
		if (err) {
			return res.status(401).json({
				errors: {
					auth: {
						message: 'No autenticado'
					}
				}
			});
		}

		if (isBlacklisted(userToken)) {
			return res.status(401).json({
				errors: {
					auth: {
						message: 'Sesión inválida'
					}
				}
			});
		}

		req.user = payload;
		next();
	});
};

export default authenticate;
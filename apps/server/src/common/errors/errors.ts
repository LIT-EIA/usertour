import { HttpStatus } from '@nestjs/common';
import { BaseError } from './base';

export class UnknownError extends BaseError {
  code = 'E0000';
  messageDict = {
    en: 'An unknown error has occurred. The Usertour team is working quickly to resolve it. Please try again later.',
    fr: "Une erreur inconnue s'est produite. L'équipe Usertour travaille rapidement pour la résoudre. Veuillez réessayer plus tard.",
  };
}

export class ContentTooLargeError extends BaseError {
  code = 'E2004';
  messageDict = {
    en: 'Content is too large. Maximum length is 100k characters.',
    fr: 'Le contenu est trop volumineux. La longueur maximale est de 100 000 caractères.',
  };
}

export class PayloadTooLargeError extends BaseError {
  code = 'E2005';
  messageDict = {
    en: 'Request payload is too large. Maximum size is 100KB.',
    fr: 'La charge utile de la requête est trop volumineuse. La taille maximale est de 100 Ko.',
  };
}

export class ConnectionError extends BaseError {
  code = 'E0001';
  messageDict = {
    en: 'Cannot connect to the Usertour server, please try again later.',
    fr: 'Impossible de se connecter au serveur Usertour, veuillez réessayer plus tard.',
  };
}

export class ParamsError extends BaseError {
  code = 'E0003';
  messageDict = {
    en: 'System parameter error. The Usertour team is working quickly to address it. Please try again later.',
    fr: "Erreur de paramètre système. L'équipe Usertour travaille rapidement pour la résoudre. Veuillez réessayer plus tard.",
  };
}

export class OAuthError extends BaseError {
  code = 'E0004';
  messageDict = {
    en: 'Authorization process failed, please try again',
    fr: "Le processus d'autorisation a échoué, veuillez réessayer",
  };
}

export class AccountNotFoundError extends BaseError {
  code = 'E0005';
  messageDict = {
    en: 'Account not found, please sign up',
    fr: 'Compte introuvable, veuillez vous inscrire',
  };
}

export class PasswordIncorrect extends BaseError {
  code = 'E0006';
  messageDict = {
    en: 'Password incorrect, please try again',
    fr: 'Mot de passe incorrect, veuillez réessayer',
  };
}

export class EmailAlreadyRegistered extends BaseError {
  code = 'E0007';
  messageDict = {
    en: 'Email already registered, please sign in or try another one',
    fr: 'Cet e-mail est déjà enregistré, veuillez vous connecter ou en essayer un autre',
  };
}

export class InvalidVerificationSession extends BaseError {
  code = 'E0008';
  messageDict = {
    en: 'Verification session not found or expired, please try again',
    fr: 'Session de vérification introuvable ou expirée, veuillez réessayer',
  };
}

export class IncorrectVerificationCode extends BaseError {
  code = 'E0009';
  messageDict = {
    en: 'Verification code is incorrect, please try again',
    fr: 'Le code de vérification est incorrect, veuillez réessayer',
  };
}

export class OperationTooFrequent extends BaseError {
  code = 'E0010';
  messageDict = {
    en: 'Operation too frequent, please try again later',
    fr: 'Opération trop fréquente, veuillez réessayer plus tard',
  };
}

export class AuthenticationExpiredError extends BaseError {
  code = 'E0011';
  messageDict = {
    en: 'Authentication expired, please sign in again',
    fr: 'La session a expiré, veuillez vous reconnecter',
  };
}

export class UnsupportedFileTypeError extends BaseError {
  code = 'E0012';
  messageDict = {
    en: 'This file type is temporarily not supported',
    fr: "Ce type de fichier n'est temporairement pas pris en charge",
  };
}

export class NoPermissionError extends BaseError {
  code = 'E0013';
  messageDict = {
    en: 'You do not have permission to access this project',
    fr: "Vous n'avez pas la permission d'accéder à ce projet",
  };
}

export class ContentNotPublishedError extends BaseError {
  code = 'E0014';
  messageDict = {
    en: 'You have reached your Survey questions limit. Please upgrade your Usertour account under Settings → Billing.',
    fr: 'Vous avez atteint votre limite de questions de sondage. Veuillez mettre à niveau votre compte Usertour dans Paramètres → Facturation.',
  };
}

export class TeamMemberLimitError extends BaseError {
  code = 'E0015';
  messageDict = {
    en: 'You have reached your team member limit. Please upgrade your Usertour account under Settings → Billing.',
    fr: "Vous avez atteint votre limite de membres d'équipe. Veuillez mettre à niveau votre compte Usertour dans Paramètres → Facturation.",
  };
}

export class InvalidLicenseError extends BaseError {
  code = 'E0016';
  messageDict = {
    en: 'Invalid license provided',
    fr: 'Licence fournie invalide',
  };
}

export class LicenseExpiredError extends BaseError {
  code = 'E0017';
  messageDict = {
    en: 'License has expired',
    fr: 'La licence a expiré',
  };
}

export class LicenseProjectMismatchError extends BaseError {
  code = 'E0018';
  messageDict = {
    en: 'License is not valid for this project',
    fr: "La licence n'est pas valide pour ce projet",
  };
}

export class LicenseDecodeError extends BaseError {
  code = 'E0019';
  messageDict = {
    en: 'Failed to decode license payload',
    fr: 'Échec du décodage des données de la licence',
  };
}

export abstract class OpenAPIError extends BaseError {
  statusCode: HttpStatus;
}

export class InvalidApiKeyError extends OpenAPIError {
  code = 'E1000';
  statusCode = HttpStatus.FORBIDDEN;
  messageDict = {
    en: 'Invalid API key provided',
    fr: 'Clé API fournie invalide',
  };
}

export class MissingApiKeyError extends OpenAPIError {
  code = 'E1010';
  statusCode = HttpStatus.UNAUTHORIZED;
  messageDict = {
    en: 'Missing API key',
    fr: 'Clé API manquante',
  };
}

export class UserNotFoundError extends OpenAPIError {
  code = 'E1001';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'User not found',
    fr: 'Utilisateur introuvable',
  };
}

export class CompanyNotFoundError extends OpenAPIError {
  code = 'E1002';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'Company not found',
    fr: 'Entreprise introuvable',
  };
}

export class CompanyMembershipNotFoundError extends OpenAPIError {
  code = 'E1003';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'Company membership not found',
    fr: "Adhésion à l'entreprise introuvable",
  };
}

export class ContentNotFoundError extends OpenAPIError {
  code = 'E1004';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'Content not found',
    fr: 'Contenu introuvable',
  };
}

export class ContentSessionNotFoundError extends OpenAPIError {
  code = 'E1005';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'Content session not found',
    fr: 'Session de contenu introuvable',
  };
}

export class InvalidLimitError extends OpenAPIError {
  code = 'E1006';
  statusCode = HttpStatus.BAD_REQUEST;
  messageDict = {
    en: 'Invalid limit parameter',
    fr: 'Paramètre de limite invalide',
  };
}

export class InvalidCursorError extends OpenAPIError {
  code = 'E1007';
  statusCode = HttpStatus.BAD_REQUEST;
  messageDict = {
    en: 'Invalid cursor parameter',
    fr: 'Paramètre de curseur invalide',
  };
}

export class InvalidCursorPreviousError extends OpenAPIError {
  code = 'E1008';
  statusCode = HttpStatus.BAD_REQUEST;
  messageDict = {
    en: 'Invalid previous cursor parameter',
    fr: 'Paramètre de curseur précédent invalide',
  };
}

export class InvalidRequestError extends OpenAPIError {
  code = 'E1009';
  statusCode = HttpStatus.BAD_REQUEST;
  messageDict = {
    en: 'Invalid request',
    fr: 'Requête invalide',
  };
}

export class RateLimitExceededError extends OpenAPIError {
  code = 'E1013';
  statusCode = HttpStatus.TOO_MANY_REQUESTS;
  messageDict = {
    en: 'Too many requests',
    fr: 'Trop de requêtes',
  };
}

export class ServiceUnavailableError extends OpenAPIError {
  code = 'E1014';
  statusCode = HttpStatus.SERVICE_UNAVAILABLE;
  messageDict = {
    en: 'Service unavailable',
    fr: 'Service indisponible',
  };
}

export class InvalidScopeError extends OpenAPIError {
  code = 'E1015';
  statusCode = HttpStatus.BAD_REQUEST;
  messageDict = {
    en: 'Invalid scope parameter',
    fr: 'Paramètre de portée invalide',
  };
}

export class InvalidOrderByError extends OpenAPIError {
  code = 'E1016';
  statusCode = HttpStatus.BAD_REQUEST;
  messageDict = {
    en: 'Invalid orderBy parameter.',
    fr: 'Paramètre orderBy invalide.',
  };
}

export class ValidationError extends OpenAPIError {
  code = 'E1017';
  statusCode = HttpStatus.BAD_REQUEST;
  messageDict = {
    en: 'Validation error',
    fr: 'Erreur de validation',
  };

  constructor(message: string) {
    super();
    this.messageDict.en = message;
  }
}

// Create a mapping of error codes to error classes
const errorMap = {
  E0000: UnknownError,
  E0001: ConnectionError,
  E0003: ParamsError,
  E0004: OAuthError,
  E0005: AccountNotFoundError,
  E0006: PasswordIncorrect,
  E0007: EmailAlreadyRegistered,
  E0008: InvalidVerificationSession,
  E0009: IncorrectVerificationCode,
  E0010: OperationTooFrequent,
  E0011: AuthenticationExpiredError,
  E0012: UnsupportedFileTypeError,
  E0013: NoPermissionError,
  E0014: ContentNotPublishedError,
  E0015: TeamMemberLimitError,
  E0016: InvalidLicenseError,
  E0017: LicenseExpiredError,
  E0018: LicenseProjectMismatchError,
  E0019: LicenseDecodeError,
  E1000: InvalidApiKeyError,
  E1001: UserNotFoundError,
  E1002: CompanyNotFoundError,
  E1003: CompanyMembershipNotFoundError,
  E1004: ContentNotFoundError,
  E1005: ContentSessionNotFoundError,
  E1006: InvalidLimitError,
  E1007: InvalidCursorError,
  E1008: InvalidCursorPreviousError,
  E1009: InvalidRequestError,
  E1010: MissingApiKeyError,
  E1013: RateLimitExceededError,
  E1014: ServiceUnavailableError,
  E1015: InvalidScopeError,
  E1016: InvalidOrderByError,
  E1017: ValidationError,
};

export function getErrorMessage(code: string, locale: string): string {
  const ErrorClass = errorMap[code];
  if (!ErrorClass) {
    return new UnknownError().getMessage(locale);
  }
  return new ErrorClass().getMessage(locale);
}

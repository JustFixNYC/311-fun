import dotenv from 'dotenv';

dotenv.config();

type HPDPayload = {
  description: string,
  locationType: string,
  problem: string,
  problemDetails: string,
  srsource?: number,
  additionalDetails: string,
  agency: 'HPD',
  anonymousRequired: 'Yes'|'No',
  dateTimeObserved: string,
  fullAddress: string,
  includeContactInfo?: boolean,
  locationDetails: string,
  siteBorough?: string,
  whattimeofdaydoestheproblemoccur?: number,
  apartmentNumber?: string,
  contact: {
    firstName: string,
    lastName: string,
    notificationEmail: string,
    primaryPhone?: string,
    street1?: string,
    street2?: string,
    borough?: string,
    zipCode?: string|null,
    city?: string,
    state?: string
  },
  addonproblems?: {
    problem: string,
    problemDetails: string,
    additionalDetails: string
  }[]
};

// Taken from:
// https://apim-gw-azu-nyc-nonprod.portal.azure-api.net/docs/services/nyc-311-create-profile/operations/api-CreateServiceRequest-post
const ExamplePayload1: HPDPayload = {
  "description" : "N/A",
  "locationType" : "Apartment",
  "problem" : "Heat/Hot Water",
  "problemDetails" : "Apartment Only",
  "srsource" : 614110000,
  "additionalDetails" : "No Heat",
  "agency" : "HPD",
  "anonymousRequired" : "No",
  "dateTimeObserved" : "10/02/2018 15:31:33",
  "fullAddress" : "1681 Madison Ave, Manhattan",
  "includeContactInfo" : true,
  "locationDetails" : "Bedroom",
  "siteBorough" : "BROOKLYN",
  "whattimeofdaydoestheproblemoccur" : 614110000,
  "apartmentNumber" : "1A",
  "contact" : {
      "firstName" : "Alfred",
      "lastName" : "Eng",
      "notificationEmail" : "aeng@doitt.nyc.gov",
      "primaryPhone" : "1234567890"
  }
};

// Taken from page 27 of `NYC_311_API_-_CreateServiceRequest.pdf`.
const ExamplePayload2: HPDPayload = {
  'problem':'General',
  'problemDetails':'Cooking Gas',
  'additionalDetails':'Shut-Off',
  'locationType':'Building-Wide',
  'locationDetails':'Building-Wide',
  'anonymousRequired':'Yes',
  'description':'Flooring and more',
  'dateTimeObserved':'2018-05-18',
  'agency':'HPD',
  'fullAddress':'1020340003',
  'contact': {
    'notificationEmail':'test2@ia.com',
    'firstName':'Tom',
    'lastName':'Smithh',
    'street1':'102',
    'street2':'Broadway',
    'borough':'Manhattan',
    'zipCode': null,
    'city':'New York',
    'state':'NY'
  },
  'addonproblems':[
    {
      'problem':'General',
      'problemDetails':'Cooking Gas',
      'additionalDetails':'Shut-Off'
    }
  ]
};

console.log(`Hello! Your subscription key is ${process.env.SUBSCRIPTION_KEY}.`);

console.log(`TODO: Write some code.`);

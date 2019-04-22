import dotenv from 'dotenv';
import fetch, { Response } from 'node-fetch';

dotenv.config();

if (!process.env.SUBSCRIPTION_KEY) {
  throw new Error('The SUBSCRIPTION_KEY environment variable must be defined!');
}

const ORIGIN = 'https://apim-gw-azu-nyc-nonprod.azure-api.net';

const SUBSCRIPTION_KEY = process.env.SUBSCRIPTION_KEY;

/** The response when a CreateServiceRequest API call succeeds. */
type CreateServiceRequestResponse = {
  /** The service request number, e.g. "311-10865100" */
  SRNumber: string,
  /** e.g. "Your Service Request has been submitted. Please note your Service Request Number for future reference SR# 311-10865100." */
  SLALanguage: string
};

/**
 * This represents the status a 311 service request can be in.
 */
enum ServiceRequestStatus {
  Open = '614110001',
  InProgress = '614110002',
  Cancelled = '614110000',
  Closed = '614110003'
}

/** This is the return value of the GetServiceRequest API endpoint (when it succeeds). */
type GetServiceRequestResponse = {
  /** The service request number, e.g. "311-10865100" */
  SRNumber: string,
  /** New York City’s Agency who handled the request, e.g. 'Department of Housing Preservation and Development' */
  Agency: string,
  /** Problem of the Service Request, e.g. 'Heat/Hot Water' */
  Problem: string,
  /** Subcategory of the problem, e.g. 'Apartment Only' */
  ProblemDetails: string,
  /** e.g. 'No Heat' */
  AdditionalDetails: string,
  /** e.g. '614110002' */
  Status: ServiceRequestStatus,
  /** Time Stamp of Service Request, e.g. '2019-04-22T17:53:00' */
  DateTimeSubmitted: string,
  /** Address of the incident reported in the Service Request */
  Address: {
    /** e.g. 'MANHATTAN' */
    Borough: string,
    /** e.g. '1681 MADISON AVENUE, MANHATTAN (NEW YORK), NY, 10029' */
    FullAddress: string
  }
};

/** The response when an API endpoint fails. */
type APIErrorBody = {
  Error: {
    /** e.g. "InternalServerError" */
    Code: string,
    /** e.g. "Value cannot be null.\r\nParameter name: key" */
    Message: string
  }
};

/** Where a service request came from, I guess? */
enum ServiceRequestSource {
  Android = 614110000,
  Other = 614110005,
  iPhone = 614110008,
  Default = 614110004
}

/** Represents a time of day in a service request. */
enum TimeOfDay {
  /** 9 AM - 12 PM */
  _0900_to_1200 = 614110000,
  /** 12 PM - 4 PM */
  _1200_to_1600 = 614110001,
  /** 4 PM - 9 PM */
  _1600_to_2100 = 614110002,
  /** 9 PM - 11 PM */
  _2100_to_2300 = 614110003,
  /** 11 PM - 9 AM */
  _2300_to_0900 = 614110004,
  /** All the time */
  allTheTime = 614110005
}

/**
 * The payload provided to the CreateServiceRequest API when
 * creating a new Housing Preservation and Development (HPD)
 * 311 service request.
 * 
 * Note that the actual fields here are unclear, because the
 * two sources of documentation we have at present seem to
 * conflict.
 */
type CreateHPDServiceRequestPayload = {
  description: string,
  locationType: string,
  problem: string,
  problemDetails: string,
  srsource?: ServiceRequestSource,
  additionalDetails: string,
  agency: 'HPD',
  anonymousRequired: 'Yes'|'No',
  dateTimeObserved: string,
  fullAddress: string,
  includeContactInfo?: boolean,
  locationDetails: string,
  siteBorough?: string,
  whattimeofdaydoestheproblemoccur?: TimeOfDay,
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

/** Error subclass containing information on 311 API errors. */
class APIError extends Error {
  constructor(readonly status: number, readonly code: string, readonly serverMessage: string) {
    super(`HTTP ${status}: ${code} - ${serverMessage}`);
  }
}

/**
 * Example HPD create service request payload #1
 * 
 * Taken from:
 * https://apim-gw-azu-nyc-nonprod.portal.azure-api.net/docs/services/nyc-311-create-profile/operations/api-CreateServiceRequest-post
 */
const ExamplePayload1: CreateHPDServiceRequestPayload = {
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

/**
 * Example HPD create service request payload #2
 * 
 * Taken from page 27 of `NYC_311_API_-_CreateServiceRequest.pdf`.
 *
 * NOTE: Submitting this doesn't actually work, it results in
 * an HTTP 400 with error code "BadRequest", message
 * "WhatTimeOfdayDoesTheProblemOccur is required".
 */
const ExamplePayload2: CreateHPDServiceRequestPayload = {
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

/**
 * Creates a Service Request in the NYC 311 system.
 */
async function createServiceRequest(payload: CreateHPDServiceRequestPayload): Promise<CreateServiceRequestResponse> {
  const res = await fetch(`${ORIGIN}/create-sr/api/CreateServiceRequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY
    },
    body: JSON.stringify(payload)
  });

  if (res.status === 200) {
    return await res.json();
  }

  throw await getApiError(res);
}

/**
 * Returns service request details.
 * 
 * Use this service to get the latest status of a Service Request by using the
 * Service Request number. All data that has no privacy concern are retrievable.
 */
async function getServiceRequest(srNumber: string): Promise<GetServiceRequestResponse> {
  const res = await fetch(`${ORIGIN}/public/api/GetServiceRequest?SRNumber=${encodeURIComponent(srNumber)}`, {
    headers: {
      'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY
    }
  });

  if (res.status === 200) {
    return await res.json();
  }

  throw await getApiError(res);
}

/**
 * Retrieve API error details from the given fetch response and
 * return them.
 */
async function getApiError(res: Response): Promise<APIError> {
  try {
    let resBody: APIErrorBody = await res.json();
    return new APIError(res.status, resBody.Error.Code, resBody.Error.Message);
  } catch (e) {
    console.error(`Error while decoding CreateServiceRequest error response body: ${e}`);
    throw new Error(`Received HTTP ${res.status}`);
  }
}

async function main() {
  console.log("Submitting service request...");

  const result = await createServiceRequest(ExamplePayload1);

  console.log(result.SLALanguage);
  console.log(`Retrieving service request number ${result.SRNumber}...`);

  const info = await getServiceRequest(result.SRNumber);

  console.log("Response follows:");
  console.log(info);  
}

if (module.parent === null) {
  main().catch(e => {
    console.log("ERROR", e);
    process.exit(1);  
  });
}

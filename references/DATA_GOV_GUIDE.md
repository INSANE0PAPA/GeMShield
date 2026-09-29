# GeMShield — data.gov.in Access Guide

## 1. Search
Open `data.gov.in` and search terms such as:
- Tender
- Public Procurement
- Procurement
- Government Tender

The current data.gov.in Tender keyword page lists tender/procurement-related resources, including Assam public procurement data. citeturn801793search1turn797001search2

## 2. Resource page
Open a resource and inspect:
- Resource title
- Publisher / Ministry
- Access type
- File type
- Download / Preview
- Data API (if available)

Do not assume every resource is a PDF.

## 3. API key
For a resource with Data API:
1. Open its API/resource page.
2. Use **Generate API Key**.
3. Copy the key to the backend environment only.
4. Use the resource ID supplied by data.gov.in.

Official resource API pages expose the `api.data.gov.in` base and resource GET operation. citeturn334858search0

Typical pattern:

```text
https://api.data.gov.in/resource/<RESOURCE_ID>?api-key=<API_KEY>&format=json&limit=100
```

Use the exact resource ID returned by the platform; do not invent one.

## 4. PDF resources
Some data.gov.in resources are actual PDFs hosted by the OGD platform.

One currently accessible example is:

`https://www.data.gov.in/sites/default/files/Compendium_Data_Driven_Decision_Making_NIC.pdf`

This is a genuine data.gov.in-hosted PDF, but it is a government decision-making/OGD compendium, not a bidder's GeM submission. citeturn801793search15

For GeMShield:
- import only actual PDFs from the data.gov.in domain for the demo document library;
- preserve their source attribution;
- run the compliance engine on the actual content;
- allow the result to be `cannot_determine` / missing evidence if the source does not contain bidder evidence.

## 5. Important limitation
data.gov.in is a broad government open-data platform. It contains structured datasets as well as some documents, but it does not guarantee that a search for “tender” returns complete GeM bid PDFs.

Therefore GeMShield must:
- discover actual resources;
- verify the file type;
- show the source;
- never fabricate a PDF;
- never claim a generic government report is a bidder bid.

## 6. Backend integration
The application should expose:

```http
GET  /sources/data-gov/search?q=<query>
GET  /sources/data-gov/resources/<resourceId>
POST /sources/data-gov/import
GET  /sources/data-gov/imports
```

Store:
- title
- publisher
- resource ID
- original URL
- source domain
- mime type
- fetched timestamp
- SHA-256
- local/object-store path

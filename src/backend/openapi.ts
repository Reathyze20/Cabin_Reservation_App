import { PORT } from "../config/config";

type JsonSchema = Record<string, unknown>;
type OpenApiObject = Record<string, unknown>;

const ref = (schemaName: string): JsonSchema => ({
  $ref: `#/components/schemas/${schemaName}`,
});

const jsonResponse = (schema: JsonSchema, description: string, examples?: Record<string, unknown>): OpenApiObject => {
  const response: OpenApiObject = {
    description,
    content: {
      "application/json": {
        schema,
      },
    },
  };

  if (examples) {
    const content = response.content as Record<string, OpenApiObject>;
    content["application/json"].examples = examples;
  }

  return response;
};

const jsonRequestBody = (schema: JsonSchema, description?: string, required = true): OpenApiObject => {
  const requestBody: OpenApiObject = {
    required,
    content: {
      "application/json": {
        schema,
      },
    },
  };

  if (description) {
    requestBody.description = description;
  }

  return requestBody;
};

const multipartRequestBody = (schema: JsonSchema, description?: string): OpenApiObject => {
  const requestBody: OpenApiObject = {
    required: true,
    content: {
      "multipart/form-data": {
        schema,
      },
    },
  };

  if (description) {
    requestBody.description = description;
  }

  return requestBody;
};

const bearerSecurity = [{ BearerAuth: [] as string[] }];

const schemas: Record<string, JsonSchema> = {
  ErrorResponse: {
    type: "object",
    required: ["message"],
    properties: {
      message: { type: "string", example: "Chyba serveru." },
      code: { type: "string", nullable: true, example: "ACCOUNT_BANNED" },
      errorId: { type: "string", nullable: true, example: "a1b2c3d4" },
    },
  },
  ValidationIssue: {
    type: "object",
    required: ["path", "message"],
    properties: {
      path: { type: "string", example: "password" },
      message: { type: "string", example: "Heslo musí mít alespoň 8 znaků" },
    },
  },
  ValidationErrorResponse: {
    type: "object",
    required: ["message", "errors"],
    properties: {
      message: { type: "string", example: "Chyba validace" },
      errors: {
        type: "array",
        items: ref("ValidationIssue"),
      },
    },
  },
  HealthResponse: {
    type: "object",
    required: ["status", "timestamp", "database"],
    properties: {
      status: { type: "string", example: "ok" },
      timestamp: { type: "string", format: "date-time" },
      database: { type: "string", example: "connected" },
    },
  },
  LoginRequest: {
    type: "object",
    required: ["username", "password"],
    properties: {
      username: { type: "string", example: "admin" },
      password: { type: "string", format: "password", example: "tajneheslo123" },
    },
  },
  LoginResponse: {
    type: "object",
    required: ["token", "username", "userId", "role", "cabinId", "isSuperAdmin"],
    properties: {
      token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
      username: { type: "string", example: "admin" },
      userId: { type: "string", format: "uuid" },
      role: { type: "string", enum: ["admin", "user", "guest"] },
      color: { type: "string", nullable: true, example: "#FFB300" },
      animalIcon: { type: "string", nullable: true, example: "fox" },
      cabinId: { type: "string", format: "uuid", nullable: true },
      isSuperAdmin: { type: "boolean", example: false },
    },
  },
  RegisterRequest: {
    type: "object",
    required: ["cabinName", "weatherLocation", "username", "email", "password"],
    properties: {
      cabinName: { type: "string", example: "Chata Trebenice" },
      subdomain: { type: "string", nullable: true, example: "trebenice" },
      weatherLocation: { type: "string", example: "Trebenice" },
      username: { type: "string", example: "novyadmin" },
      email: { type: "string", format: "email", example: "admin@example.cz" },
      password: { type: "string", format: "password", example: "tajneheslo123" },
      color: { type: "string", nullable: true, example: "#FFB300" },
    },
  },
  RegisterResponse: {
    type: "object",
    required: ["message"],
    properties: {
      message: { type: "string", example: "Registrace úspěšná. Zkontrolujte e-mail kvůli ověření účtu." },
      testCode: { type: "string", nullable: true, example: "123456" },
    },
  },
  UserProfile: {
    type: "object",
    required: ["id", "username", "email", "color", "animalIcon", "role", "isEmailVerified"],
    properties: {
      id: { type: "string", format: "uuid" },
      username: { type: "string", example: "admin" },
      email: { type: "string", format: "email", nullable: true, example: "admin@example.cz" },
      color: { type: "string", nullable: true, example: "#FFB300" },
      animalIcon: { type: "string", nullable: true, example: "fox" },
      role: { type: "string", enum: ["admin", "user", "guest"] },
      isEmailVerified: { type: "boolean", example: true },
    },
  },
  UpdateProfileRequest: {
    type: "object",
    properties: {
      email: { type: "string", format: "email", nullable: true, example: "admin@example.cz" },
      color: { type: "string", nullable: true, example: "#22C55E" },
      animalIcon: { type: "string", nullable: true, example: "fox" },
    },
  },
  UpdateProfileResponse: {
    type: "object",
    required: ["message", "user"],
    properties: {
      message: { type: "string", example: "Profil aktualizován." },
      user: {
        type: "object",
        properties: {
          email: { type: "string", format: "email", nullable: true },
          color: { type: "string", nullable: true },
          animalIcon: { type: "string", nullable: true },
        },
      },
    },
  },
  ChangeMyPasswordRequest: {
    type: "object",
    required: ["oldPassword", "newPassword"],
    properties: {
      oldPassword: { type: "string", format: "password" },
      newPassword: { type: "string", format: "password" },
    },
  },
  MessageResponse: {
    type: "object",
    required: ["message"],
    properties: {
      message: { type: "string", example: "OK" },
    },
  },
  CabinSettings: {
    type: "object",
    required: ["id", "name", "subdomain", "weatherLocation", "isWinterized", "features", "createdAt"],
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string", example: "Chata Trebenice" },
      subdomain: { type: "string", example: "trebenice" },
      description: { type: "string", nullable: true },
      welcomeMessage: { type: "string", nullable: true },
      rules: { type: "string", nullable: true },
      departureChecklist: {
        type: "array",
        nullable: true,
        items: { type: "string" },
      },
      coverPhotoUrl: { type: "string", nullable: true },
      weatherLocation: { type: "string", nullable: true, example: "Trebenice" },
      isWinterized: { type: "boolean", example: true },
      features: {
        type: "object",
        nullable: true,
        additionalProperties: true,
      },
      createdAt: { type: "string", format: "date-time" },
    },
  },
  UpdateCabinSettingsRequest: {
    type: "object",
    properties: {
      name: { type: "string", example: "Chata Trebenice" },
      description: { type: "string", nullable: true },
      welcomeMessage: { type: "string", nullable: true },
      rules: { type: "string", nullable: true },
      departureChecklist: {
        type: "array",
        nullable: true,
        items: { type: "string" },
      },
      coverPhotoUrl: { type: "string", nullable: true },
      weatherLocation: { type: "string", nullable: true },
      isWinterized: { type: "boolean" },
      features: { type: "object", additionalProperties: true },
    },
  },
  Reservation: {
    type: "object",
    required: ["id", "userId", "username", "from", "to", "purpose", "status"],
    properties: {
      id: { type: "string", format: "uuid" },
      userId: { type: "string", format: "uuid" },
      username: { type: "string", example: "admin" },
      from: { type: "string", format: "date", example: "2026-06-12" },
      to: { type: "string", format: "date", example: "2026-06-14" },
      purpose: { type: "string", example: "Vikend na chate" },
      notes: { type: "string", nullable: true },
      handoverNote: { type: "string", nullable: true },
      status: { type: "string", enum: ["primary", "soft", "backup"] },
      userColor: { type: "string", nullable: true },
      userAnimalIcon: { type: "string", nullable: true },
      isCheckoutCompleted: { type: "boolean", nullable: true },
      checkoutCompletedBy: { type: "string", nullable: true },
      checkoutCompletedAt: { type: "string", format: "date-time", nullable: true },
    },
  },
  Availability: {
    type: "object",
    required: ["id", "userId", "username", "startDate", "endDate"],
    properties: {
      id: { type: "string", format: "uuid" },
      userId: { type: "string", format: "uuid" },
      username: { type: "string" },
      userColor: { type: "string", nullable: true },
      userAnimalIcon: { type: "string", nullable: true },
      startDate: { type: "string", format: "date" },
      endDate: { type: "string", format: "date" },
    },
  },
  ReservationListResponse: {
    type: "object",
    required: ["reservations", "availabilities"],
    properties: {
      reservations: {
        type: "array",
        items: ref("Reservation"),
      },
      availabilities: {
        type: "array",
        items: ref("Availability"),
      },
    },
  },
  CreateReservationRequest: {
    type: "object",
    required: ["from", "to", "purpose"],
    properties: {
      from: { type: "string", format: "date", example: "2026-06-12" },
      to: { type: "string", format: "date", example: "2026-06-14" },
      purpose: { type: "string", example: "Vikend na chate" },
      notes: { type: "string", nullable: true },
      handoverNote: { type: "string", nullable: true },
      status: { type: "string", enum: ["primary", "soft"], nullable: true },
    },
  },
  ShoppingUser: {
    type: "object",
    required: ["id", "username"],
    properties: {
      id: { type: "string", format: "uuid" },
      username: { type: "string" },
      color: { type: "string", nullable: true },
      animalIcon: { type: "string", nullable: true },
    },
  },
  ShoppingItem: {
    type: "object",
    required: ["id", "name", "status", "isEssential"],
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      status: { type: "string", enum: ["pending", "bring_from_home", "purchased"] },
      isEssential: { type: "boolean" },
      addedBy: ref("ShoppingUser"),
      purchasedBy: {
        allOf: [ref("ShoppingUser")],
        nullable: true,
      },
      splits: {
        type: "array",
        items: { type: "object", additionalProperties: true },
      },
    },
  },
  ShoppingList: {
    type: "object",
    required: ["id", "name", "createdAt", "isResolved", "isPantry", "items"],
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      isResolved: { type: "boolean" },
      isPantry: { type: "boolean" },
      createdBy: ref("ShoppingUser"),
      items: {
        type: "array",
        items: ref("ShoppingItem"),
      },
    },
  },
  CreateShoppingListRequest: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", example: "Vikendovy nakup" },
    },
  },
  InventoryItem: {
    type: "object",
    required: ["id", "name", "category", "status", "isEssential", "inCart"],
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      category: { type: "string", example: "TRVANLIVE" },
      status: { type: "string", enum: ["OK", "LOW", "EMPTY"] },
      location: { type: "string", nullable: true },
      isEssential: { type: "boolean" },
      inCart: { type: "boolean" },
      updatedBy: {
        allOf: [ref("ShoppingUser")],
        nullable: true,
      },
    },
  },
  CreateInventoryItemRequest: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", example: "Kava" },
      category: { type: "string", example: "TRVANLIVE" },
      status: { type: "string", enum: ["OK", "LOW", "EMPTY"] },
      location: { type: "string", nullable: true, example: "Kredenc" },
      isEssential: { type: "boolean", example: false },
    },
  },
  Channel: {
    type: "object",
    required: ["id", "name", "messageCount", "hasUnread"],
    properties: {
      id: { type: "string", format: "uuid", nullable: true },
      name: { type: "string", example: "Hlavni" },
      createdById: { type: "string", format: "uuid", nullable: true },
      createdAt: { type: "string", format: "date-time", nullable: true },
      messageCount: { type: "integer", example: 8 },
      lastMessage: { type: "string", nullable: true },
      lastMessageAt: { type: "string", format: "date-time", nullable: true },
      lastMessageBy: { type: "string", nullable: true },
      hasUnread: { type: "boolean" },
    },
  },
  CreateChannelRequest: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", example: "Organizace vikendu" },
    },
  },
  GalleryFolder: {
    type: "object",
    required: ["id", "name"],
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string", example: "Leto 2026" },
    },
  },
  CreateGalleryFolderRequest: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", example: "Leto 2026" },
    },
  },
  GalleryPhoto: {
    type: "object",
    required: ["id", "folderId", "src"],
    properties: {
      id: { type: "string", format: "uuid" },
      folderId: { type: "string", format: "uuid" },
      src: { type: "string", example: "/uploads/123.webp" },
      thumbSrc: { type: "string", nullable: true, example: "/uploads/thumbs/123.webp" },
      description: { type: "string", nullable: true },
    },
  },
  GalleryUploadResponse: {
    type: "array",
    items: ref("GalleryPhoto"),
  },
  AdminSystemResponse: {
    type: "object",
    required: ["userCount", "reservationCount", "photoCount", "noteCount"],
    properties: {
      userCount: { type: "integer", example: 5 },
      reservationCount: { type: "integer", example: 42 },
      photoCount: { type: "integer", example: 120 },
      noteCount: { type: "integer", example: 83 },
    },
  },
  LogEntry: {
    type: "object",
    additionalProperties: true,
    properties: {
      time: { type: "string", format: "date-time" },
      level: { type: "string", example: "info" },
      msg: { type: "string", example: "Token refreshed" },
      module: { type: "string", nullable: true, example: "AUTH" },
      requestId: { type: "string", nullable: true },
    },
  },
  LogsResponse: {
    type: "object",
    required: ["date", "count", "logs"],
    properties: {
      date: { type: "string", format: "date" },
      count: { type: "integer", example: 12 },
      logs: {
        type: "array",
        items: ref("LogEntry"),
      },
    },
  },
  LogFilesResponse: {
    type: "object",
    required: ["files"],
    properties: {
      files: {
        type: "array",
        items: { type: "string", example: "2026-05-30.log" },
      },
    },
  },
};

const paths: Record<string, OpenApiObject> = {
  "/api/health": {
    get: {
      tags: ["System"],
      summary: "Health check backendu a DB",
      responses: {
        "200": jsonResponse(ref("HealthResponse"), "Backend a databaze jsou dostupne"),
        "503": jsonResponse(ref("HealthResponse"), "Databaze neni dostupna"),
      },
    },
  },
  "/api/login": {
    post: {
      tags: ["Auth"],
      summary: "Prihlaseni uzivatele",
      requestBody: jsonRequestBody(ref("LoginRequest"), "Uzivatelske jmeno a heslo"),
      responses: {
        "200": jsonResponse(ref("LoginResponse"), "Prihlaseni probehlo uspesne"),
        "400": jsonResponse(ref("ValidationErrorResponse"), "Neplatny format requestu"),
        "401": jsonResponse(ref("ErrorResponse"), "Spatne prihlasovaci udaje"),
        "403": jsonResponse(ref("ErrorResponse"), "Ucet neni overen nebo je blokovan"),
      },
    },
  },
  "/api/register": {
    post: {
      tags: ["Auth"],
      summary: "Registrace nove chaty a admin uzivatele",
      requestBody: jsonRequestBody(ref("RegisterRequest")),
      responses: {
        "201": jsonResponse(ref("RegisterResponse"), "Registrace probehla uspesne"),
        "400": jsonResponse(ref("ErrorResponse"), "Neplatny vstup"),
        "409": jsonResponse(ref("ErrorResponse"), "Konflikt uzivatele nebo e-mailu"),
      },
    },
  },
  "/api/users/me": {
    get: {
      tags: ["Users"],
      summary: "Nacti profil prihlaseneho uzivatele",
      security: bearerSecurity,
      responses: {
        "200": jsonResponse(ref("UserProfile"), "Profil uzivatele"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
        "404": jsonResponse(ref("ErrorResponse"), "Uzivatel nebyl nalezen"),
      },
    },
    patch: {
      tags: ["Users"],
      summary: "Uprav profil prihlaseneho uzivatele",
      security: bearerSecurity,
      requestBody: jsonRequestBody(ref("UpdateProfileRequest")),
      responses: {
        "200": jsonResponse(ref("UpdateProfileResponse"), "Profil byl aktualizovan"),
        "400": jsonResponse(ref("ValidationErrorResponse"), "Neplatny vstup"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
      },
    },
  },
  "/api/users/me/password": {
    patch: {
      tags: ["Users"],
      summary: "Zmen heslo prihlaseneho uzivatele",
      security: bearerSecurity,
      requestBody: jsonRequestBody(ref("ChangeMyPasswordRequest")),
      responses: {
        "200": jsonResponse(ref("MessageResponse"), "Heslo bylo zmeneno"),
        "400": jsonResponse(ref("ErrorResponse"), "Puvodni heslo nesedi"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
      },
    },
  },
  "/api/cabin": {
    get: {
      tags: ["Cabin"],
      summary: "Nacti aktualni nastaveni chaty",
      security: bearerSecurity,
      responses: {
        "200": jsonResponse(ref("CabinSettings"), "Aktualni nastaveni chaty"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
        "403": jsonResponse(ref("ErrorResponse"), "Uzivatel nema priirazenou chatu"),
        "404": jsonResponse(ref("ErrorResponse"), "Chata nebyla nalezena"),
      },
    },
    patch: {
      tags: ["Cabin"],
      summary: "Uprav nastaveni chaty",
      security: bearerSecurity,
      requestBody: jsonRequestBody(ref("UpdateCabinSettingsRequest")),
      responses: {
        "200": jsonResponse(ref("CabinSettings"), "Nastaveni chaty bylo ulozeno"),
        "400": jsonResponse(ref("ErrorResponse"), "Neplatny vstup"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
        "403": jsonResponse(ref("ErrorResponse"), "Pouze admin muze menit nastaveni"),
      },
    },
  },
  "/api/reservations": {
    get: {
      tags: ["Reservations"],
      summary: "Seznam rezervaci a dostupnosti pro aktualni chatu",
      security: bearerSecurity,
      responses: {
        "200": jsonResponse(ref("ReservationListResponse"), "Data rezervaci a dostupnosti"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
        "403": jsonResponse(ref("ErrorResponse"), "Uzivatel nema priirazenou chatu"),
      },
    },
    post: {
      tags: ["Reservations"],
      summary: "Vytvor novou rezervaci",
      security: bearerSecurity,
      requestBody: jsonRequestBody(ref("CreateReservationRequest")),
      responses: {
        "201": jsonResponse(ref("Reservation"), "Rezervace byla vytvorena"),
        "400": jsonResponse(ref("ValidationErrorResponse"), "Neplatny vstup"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
        "403": jsonResponse(ref("ErrorResponse"), "Uzivatel nema priirazenou chatu"),
      },
    },
  },
  "/api/shopping-lists": {
    get: {
      tags: ["Shopping"],
      summary: "Seznam aktivnich nakupnich seznamu",
      security: bearerSecurity,
      parameters: [
        {
          name: "isPantry",
          in: "query",
          required: false,
          description: "true = jen spiz, false = bezne seznamy",
          schema: { type: "string", enum: ["true", "false"] },
        },
      ],
      responses: {
        "200": jsonResponse({ type: "array", items: ref("ShoppingList") }, "Aktivni nakupni seznamy"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
        "403": jsonResponse(ref("ErrorResponse"), "Uzivatel nema priirazenou chatu"),
      },
    },
    post: {
      tags: ["Shopping"],
      summary: "Vytvor novy nakupni seznam",
      security: bearerSecurity,
      requestBody: jsonRequestBody(ref("CreateShoppingListRequest")),
      responses: {
        "201": jsonResponse(ref("ShoppingList"), "Seznam byl vytvoren"),
        "400": jsonResponse(ref("ValidationErrorResponse"), "Neplatny vstup"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
      },
    },
  },
  "/api/inventory": {
    get: {
      tags: ["Inventory"],
      summary: "Seznam zasob na chate",
      security: bearerSecurity,
      responses: {
        "200": jsonResponse({ type: "array", items: ref("InventoryItem") }, "Inventar chaty"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
        "403": jsonResponse(ref("ErrorResponse"), "Uzivatel nema priirazenou chatu"),
      },
    },
    post: {
      tags: ["Inventory"],
      summary: "Vytvor novou polozku inventare",
      security: bearerSecurity,
      requestBody: jsonRequestBody(ref("CreateInventoryItemRequest")),
      responses: {
        "201": jsonResponse(ref("InventoryItem"), "Polozka inventare byla vytvorena"),
        "400": jsonResponse(ref("ValidationErrorResponse"), "Neplatny vstup"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
      },
    },
  },
  "/api/channels": {
    get: {
      tags: ["Channels"],
      summary: "Seznam kanalu s preview posledni zpravy",
      security: bearerSecurity,
      responses: {
        "200": jsonResponse({ type: "array", items: ref("Channel") }, "Kanaly chaty"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
        "403": jsonResponse(ref("ErrorResponse"), "Uzivatel nema priirazenou chatu"),
      },
    },
    post: {
      tags: ["Channels"],
      summary: "Vytvor novy kanal",
      security: bearerSecurity,
      requestBody: jsonRequestBody(ref("CreateChannelRequest")),
      responses: {
        "201": jsonResponse(ref("Channel"), "Kanal byl vytvoren"),
        "400": jsonResponse(ref("ErrorResponse"), "Neplatny vstup"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
      },
    },
  },
  "/api/gallery/folders": {
    get: {
      tags: ["Gallery"],
      summary: "Seznam galerijnich slozek",
      security: bearerSecurity,
      responses: {
        "200": jsonResponse({ type: "array", items: ref("GalleryFolder") }, "Slozky galerie"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
        "403": jsonResponse(ref("ErrorResponse"), "Uzivatel nema priirazenou chatu"),
      },
    },
    post: {
      tags: ["Gallery"],
      summary: "Vytvor novou galerijni slozku",
      security: bearerSecurity,
      requestBody: jsonRequestBody(ref("CreateGalleryFolderRequest")),
      responses: {
        "201": jsonResponse(ref("GalleryFolder"), "Slozka byla vytvorena"),
        "400": jsonResponse(ref("ValidationErrorResponse"), "Neplatny vstup"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
      },
    },
  },
  "/api/gallery/photos": {
    post: {
      tags: ["Gallery"],
      summary: "Nahraj jednu nebo vice fotek do slozky",
      security: bearerSecurity,
      requestBody: multipartRequestBody(
        {
          type: "object",
          required: ["folderId", "photos"],
          properties: {
            folderId: { type: "string", format: "uuid", example: "11111111-1111-1111-1111-111111111111" },
            photos: {
              type: "array",
              items: { type: "string", format: "binary" },
            },
          },
        },
        "V Postmanu pouzijte form-data pole folderId a jedno nebo vice poli photos"
      ),
      responses: {
        "200": jsonResponse(ref("GalleryUploadResponse"), "Fotky byly uspesne nahrane"),
        "400": jsonResponse(ref("ErrorResponse"), "Chybi folderId nebo soubory"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
        "404": jsonResponse(ref("ErrorResponse"), "Slozka nebyla nalezena"),
      },
    },
  },
  "/api/admin/system": {
    get: {
      tags: ["Admin"],
      summary: "Zakladni systemove statistiky pro admina",
      security: bearerSecurity,
      responses: {
        "200": jsonResponse(ref("AdminSystemResponse"), "Systemove statistiky"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
        "403": jsonResponse(ref("ErrorResponse"), "Pouze pro admina"),
      },
    },
  },
  "/api/logs/files": {
    get: {
      tags: ["Logs"],
      summary: "Seznam dostupnych log souboru",
      security: bearerSecurity,
      responses: {
        "200": jsonResponse(ref("LogFilesResponse"), "Dostupne log soubory"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
        "403": jsonResponse(ref("ErrorResponse"), "Pouze pro adminy"),
      },
    },
  },
  "/api/logs": {
    get: {
      tags: ["Logs"],
      summary: "Cteni backend/frontend logu s filtry",
      security: bearerSecurity,
      parameters: [
        { name: "date", in: "query", schema: { type: "string", format: "date" }, required: false },
        { name: "lines", in: "query", schema: { type: "integer", minimum: 1, maximum: 500 }, required: false },
        { name: "level", in: "query", schema: { type: "string", enum: ["debug", "info", "warn", "error"] }, required: false },
        { name: "source", in: "query", schema: { type: "string", enum: ["backend", "frontend"] }, required: false },
        { name: "requestId", in: "query", schema: { type: "string" }, required: false },
        { name: "userId", in: "query", schema: { type: "string" }, required: false },
        { name: "module", in: "query", schema: { type: "string" }, required: false },
        { name: "path", in: "query", schema: { type: "string" }, required: false },
        { name: "status", in: "query", schema: { type: "integer", minimum: 100, maximum: 599 }, required: false },
        { name: "search", in: "query", schema: { type: "string" }, required: false },
      ],
      responses: {
        "200": jsonResponse(ref("LogsResponse"), "Filtrovany vystup logu"),
        "400": jsonResponse(ref("ErrorResponse"), "Neplatny filtr logu"),
        "401": jsonResponse(ref("ErrorResponse"), "Chybi nebo je neplatny token"),
        "403": jsonResponse(ref("ErrorResponse"), "Pouze pro adminy"),
      },
    },
  },
};

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Chata API",
    version: "1.0.0",
    description: "Starter OpenAPI coverage for backend learning flows, Swagger UI and Postman. Covers the most useful endpoints for auth, profile, cabin, reservations, shopping, inventory, channels, gallery, admin and logs. The backend contains more routes than are currently documented here.",
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: "Local backend",
    },
    {
      url: "/",
      description: "Relative backend origin",
    },
  ],
  tags: [
    { name: "System", description: "Health and platform status" },
    { name: "Auth", description: "Public authentication flows" },
    { name: "Users", description: "Current user profile endpoints" },
    { name: "Cabin", description: "Cabin settings and shared configuration" },
    { name: "Reservations", description: "Reservation planning and availability" },
    { name: "Shopping", description: "Shopping lists" },
    { name: "Inventory", description: "Pantry and stock" },
    { name: "Channels", description: "Chat channels" },
    { name: "Gallery", description: "Gallery folders and uploads" },
    { name: "Admin", description: "Admin-only cabin diagnostics" },
    { name: "Logs", description: "Operational log access" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas,
  },
  paths,
} as const;
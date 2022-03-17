# moysklad-1c-export-stack

> Сервис выгрузки дополнительной информации из МойСклад для файла импорта в 1С

## Авторизация

Для доступа к сервису используется Basic авторизация.
Необходимо указать логин и пароль пользователя МойСклад.

## Параметры запроса

Параметры передаются в теле POST запроса в формате JSON.

Пример тела запроса:

```json
{
  "dateFrom": "2022-03-01T00:00:00.000Z",
  "dateTo": "2022-03-17T11:04:40.930Z"
}
```

где:

- `dateFrom` - дата с которой необходимо получить документы (включительно)
- `dateTo` - дата до которой необходимо получить документы (включительно)

В качестве даты выборки используется дата документа.

## Формат ответа

### Успешный ответ

Код ответа сервера - `200`

Тело ответа:

```json
{
  "ok": true,
  "result": [
    {
      "type": "paymentout",
      "name": "88 (2)",
      "moment": "2022-03-09T21:00:00.000Z",
      "expenseType": "Налоги и сборы"
    },
    {
      "type": "paymentin",
      "name": "117",
      "moment": "2022-03-09T21:00:00.000Z",
      "incomingNumber": "117",
      "incomingDate": "2022-03-09T21:00:00.000Z"
    },
    {
      "type": "retaildemand",
      "name": "NV-rdm-02358",
      "moment": "2022-03-03T10:09:00.000Z",
      "taxSystem": "ЕНВД"
    }
  ]
}
```

- Поле `ok` - `true`
- Поле `result` содержит массив с данными

**Возможные варианты объектов:**

Для всех объект присутствуют поля:

- `type` - тип документа
- `name` - наименование документа
- `moment` - дата документа

Поля специфичные для типа документа:

- _Исходящий платеж_

  - `type` - `paymentout`
  - `expenseType` - тип исходящего платежа

- _Входящий платеж_

  - `type` - `paymentin`
  - `incomingNumber` - номер входящего документа
  - `incomingDate` - дата исходящего документа

- _Розничная продажа_

  - `type` - `retaildemand`
  - `taxSystem` - система налогооблажения

  Варианты поля `taxSystem`:

  - `ОСН`
  - `УСН. Доход`
  - `УСН. Доход-Расход`
  - `ЕСХН`
  - `ЕНВД`
  - `Патент`

### Ошибка

Код ответа сервера не равен `200`

Тело ответа:

```json
{
  "ok": false,
  "description": "Ошибка аутентификации: Неправильный пароль или имя пользователя (https://dev.moysklad.ru/doc/api/remap/1.2/#error_1056)"
}
```

- Поле `ok` - `false`
- Поле `description` содержит описание ошибки

## Прочее

- Таймаут запроса 30 секунд
- Информация о документах из коризины (удаленных в коризну) так же включается в ответ

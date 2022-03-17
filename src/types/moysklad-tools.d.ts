declare module 'moysklad-tools' {
  export interface EntityRef {
    meta: {
      type: string
      href: string
    }
  }

  export interface Collection<T> {
    meta: EntityRef['meta'] & { size: number }
    rows?: T[]
  }

  export interface Attribute<T = any> {
    value: T
  }

  export interface EntityWithAttributes {
    attributes?: Attribute[]
  }

  export type AttrRef = string | EntityRef

  /**
   * Ищет атрибут для указанной сущности по идентификатору, ссылке или метаданным
   *
   * @param entity Сущность с атрибутами
   * @param id Идентификатор атрибута, Ref атрибута (`entity/...`) или EntityRef (`{ meta: {...} }`)
   */
  export function getAttr<T>(
    entity: EntityWithAttributes,
    ref: AttrRef
  ): Attribute<T> | undefined

  /**
   * Получить идентификатор для ссылки или сущности
   *
   * @param value Сущность, сокращенная или полная ссылка на сущность
   */
  export function getId(value: AttrRef): string

  /**
   * Получает ссылку на коллекцию и возвращает список всех элементов коллекции
   *
   * @param ms Экземпляр Moysklad
   * @param collection Коллекция элементов или Ref коллекции
   */
  export function loadRows<T>(
    ms: Object,
    collection: Collection<T>
  ): Promise<T[]>
}

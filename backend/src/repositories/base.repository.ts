import { Model, Document, FilterQuery, UpdateQuery } from 'mongoose';

export abstract class BaseRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  public async findById(id: string): Promise<T | null> {
    // Avoid fetching soft-deleted items by default
    const item = await this.model.findById(id);
    if (item && (item as any).isDeleted) {
      return null;
    }
    return item;
  }

  public async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne({ isDeleted: { $ne: true }, ...filter });
  }

  public async find(filter: FilterQuery<T>): Promise<T[]> {
    return this.model.find({ isDeleted: { $ne: true }, ...filter });
  }

  public async create(data: any): Promise<T> {
    const doc = new this.model(data);
    return doc.save() as Promise<T>;
  }

  public async update(id: string, update: UpdateQuery<T>): Promise<T | null> {
    return this.model.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } } as FilterQuery<T>,
      update,
      { new: true }
    );
  }

  public async softDelete(id: string): Promise<T | null> {
    return this.model.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() } as any,
      { new: true }
    );
  }
}
export default BaseRepository;

import { Project } from '../domain/models/index.js';

export class ProjectMapper {
  fromDB(row) {
    return new Project({
      id: row.id,
      title: row.title,
      baseUrl: row.base_url,
      ownerId: row.owner_id,
      createdAt: row.created_at,
    });
  }

  toDB(project) {
    return {
      title: project.title,
      base_url: project.baseUrl,
      owner_id: project.ownerId,
    };
  }
}

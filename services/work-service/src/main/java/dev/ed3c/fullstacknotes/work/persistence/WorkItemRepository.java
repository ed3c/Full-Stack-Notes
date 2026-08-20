package dev.ed3c.fullstacknotes.work.persistence;

import dev.ed3c.fullstacknotes.work.domain.WorkItem;
import dev.ed3c.fullstacknotes.work.domain.WorkItemStatus;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class WorkItemRepository {
    private static final RowMapper<WorkItem> ROW_MAPPER = WorkItemRepository::map;

    private final JdbcClient jdbc;

    public WorkItemRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<WorkItem> findById(UUID id) {
        return jdbc.sql("""
                        SELECT id, title, description, status, version, created_at, updated_at
                        FROM work_item
                        WHERE id = :id
                        """)
                .param("id", id)
                .query(ROW_MAPPER)
                .optional();
    }

    public List<WorkItem> list(int limit) {
        return jdbc.sql("""
                        SELECT id, title, description, status, version, created_at, updated_at
                        FROM work_item
                        ORDER BY created_at DESC, id DESC
                        LIMIT :limit
                        """)
                .param("limit", limit)
                .query(ROW_MAPPER)
                .list();
    }

    public void insert(WorkItem item) {
        int rows = jdbc.sql("""
                        INSERT INTO work_item(id, title, description, status, version, created_at, updated_at)
                        VALUES (:id, :title, :description, :status, :version, :createdAt, :updatedAt)
                        """)
                .param("id", item.id())
                .param("title", item.title())
                .param("description", item.description())
                .param("status", item.status().name())
                .param("version", item.version())
                .param("createdAt", OffsetDateTime.ofInstant(item.createdAt(), java.time.ZoneOffset.UTC))
                .param("updatedAt", OffsetDateTime.ofInstant(item.updatedAt(), java.time.ZoneOffset.UTC))
                .update();
        if (rows != 1) {
            throw new IllegalStateException("expected one inserted work_item row, got " + rows);
        }
    }

    public Optional<WorkItem> updateStatus(UUID id, long expectedVersion, WorkItemStatus nextStatus) {
        return jdbc.sql("""
                        UPDATE work_item
                        SET status = :status,
                            version = version + 1,
                            updated_at = now()
                        WHERE id = :id AND version = :expectedVersion
                        RETURNING id, title, description, status, version, created_at, updated_at
                        """)
                .param("status", nextStatus.name())
                .param("id", id)
                .param("expectedVersion", expectedVersion)
                .query(ROW_MAPPER)
                .optional();
    }

    private static WorkItem map(ResultSet rs, int rowNum) throws SQLException {
        return new WorkItem(
                rs.getObject("id", UUID.class),
                rs.getString("title"),
                rs.getString("description"),
                WorkItemStatus.valueOf(rs.getString("status")),
                rs.getLong("version"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant(),
                rs.getObject("updated_at", OffsetDateTime.class).toInstant()
        );
    }
}

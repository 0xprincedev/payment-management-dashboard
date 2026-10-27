"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { MemberActionState } from "./actions";
import MembersTable, { type MemberRow } from "./members-table";

type Section = {
  id: number;
  name: string;
  members: MemberRow[];
};

export default function AdminMembers({ groups, selfId }: { groups: Section[]; selfId: number }) {
  const router = useRouter();
  const [sections, setSections] = useState(groups);
  const [notice, setNotice] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const options = groups.map((group) => ({ id: group.id, name: group.name }));

  function handleGroupResult(memberId: number, result: MemberActionState) {
    if (result.error || result.groupId == null || !result.role) {
      if (result.error) setNotice({ severity: "error", text: result.error });
      return;
    }

    const nextGroupId = result.groupId;
    const nextRole = result.role;
    setSections((current) => {
      const source = current.find((section) => section.members.some((row) => row.id === memberId));
      const member = source?.members.find((row) => row.id === memberId);
      if (!source || !member || source.id === nextGroupId) return current;
      const updated = { ...member, role: nextRole };
      return current.map((section) => {
        if (section.id === source.id) {
          return { ...section, members: section.members.filter((row) => row.id !== memberId) };
        }
        if (section.id === nextGroupId) return { ...section, members: [...section.members, updated] };
        return section;
      });
    });
    if (result.message) setNotice({ severity: "success", text: result.message });
    if (memberId === selfId) router.refresh();
  }

  return (
    <>
      {notice ? (
        <Alert severity={notice.severity} sx={{ mt: 2 }}>
          {notice.text}
        </Alert>
      ) : null}
      {sections.map((section) => (
        <Box key={section.id} sx={{ mt: 4 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 2 }}>
            {section.name}
          </Typography>
          {section.members.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No members yet.
            </Typography>
          ) : (
            <MembersTable
              members={section.members}
              selfId={selfId}
              viewerRole="Admin"
              groupId={section.id}
              groups={options}
              onReordered={(members) =>
                setSections((current) =>
                  current.map((item) => (item.id === section.id ? { ...item, members } : item)),
                )
              }
              onGroupResult={handleGroupResult}
              onRoleChanged={(memberId, role) =>
                setSections((current) =>
                  current.map((item) =>
                    item.id === section.id
                      ? {
                          ...item,
                          members: item.members.map((member) =>
                            member.id === memberId ? { ...member, role } : member,
                          ),
                        }
                      : item,
                  ),
                )
              }
            />
          )}
        </Box>
      ))}
    </>
  );
}

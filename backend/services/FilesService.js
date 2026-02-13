const User = require('../models/User');
const File = require('../models/File');
const Space = require('../models/Space');

class FilesService {
    controleur;
    nomDInstance;
    io;

    listeDesMessagesEmis = [
        'files', 'file_uploading_status', 'file_updating_status', 'file_deleting_status',
        'spaces', 'space_creating_status', 'space_deleting_status', 'space_renaming_status',
        'resolved_path'
    ];
    listeDesMessagesRecus = [
        'get_files', 'upload_file', 'update_file', 'delete_file',
        'create_space', 'get_spaces', 'delete_space', 'rename_space',
        'resolve_path'
    ];

    constructor(controleur, io, nom) {
        this.controleur = controleur;
        this.io = io;
        this.nomDInstance = nom || 'FilesService';
        this.controleur.inscription(this, this.listeDesMessagesEmis, this.listeDesMessagesRecus);
        console.log(`[${this.nomDInstance}] Service enregistré auprès du controleur`);
    }

    async traitementMessage(mesg) {
        const socketId = mesg.id;

        if (mesg.get_files) await this.handleGetFiles(socketId, mesg.get_files);
        else if (mesg.upload_file) await this.handleUploadFile(socketId, mesg.upload_file);
        else if (mesg.update_file) await this.handleUpdateFile(socketId, mesg.update_file);
        else if (mesg.delete_file) await this.handleDeleteFile(socketId, mesg.delete_file);
        else if (mesg.create_space) await this.handleCreateSpace(socketId, mesg.create_space);
        else if (mesg.get_spaces) await this.handleGetSpaces(socketId, mesg.get_spaces);
        else if (mesg.delete_space) await this.handleDeleteSpace(socketId, mesg.delete_space);
        else if (mesg.rename_space) await this.handleRenameSpace(socketId, mesg.rename_space);
        else if (mesg.resolve_path) await this.handleResolvePath(socketId, mesg.resolve_path);
    }

    // --- Helper: check access for team/personal/global ---
    async checkSpaceAccess(space, userId) {
        const isOwner = space.owner.toString() === userId;
        const isMember = space.members && space.members.some(id => id.toString() === userId);

        if (space.category === 'team') return isOwner || isMember;
        if (space.category === 'personal') return isOwner;
        return true; // global
    }

    async checkParentChainAccess(space, userId) {
        if (await this.checkSpaceAccess(space, userId)) return true;
        if (!space.parent) return false;

        let currentParentId = space.parent;
        while (currentParentId) {
            const parentSpace = await Space.findById(currentParentId);
            if (!parentSpace) break;
            if (parentSpace.owner.toString() === userId ||
                (parentSpace.members && parentSpace.members.some(id => id.toString() === userId))) {
                return true;
            }
            currentParentId = parentSpace.parent;
        }
        return false;
    }

    // Reliable broadcast helper (uses DB-stored socket_id)
    async broadcastToAuthorized(senderSocketId, eventPayload, category, ownerId, memberIds) {
        const msgStr = JSON.stringify(eventPayload);
        try {
            if (category === 'global') {
                const sockets = await this.io.fetchSockets();
                for (const s of sockets) {
                    if (s.id !== senderSocketId) s.emit('message', msgStr);
                }
            } else if (category === 'team') {
                const authorizedIds = [...new Set([ownerId, ...(memberIds || [])])];
                const onlineUsers = await User.find({
                    _id: { $in: authorizedIds },
                    is_online: true,
                    socket_id: { $ne: null }
                }, 'socket_id');
                for (const u of onlineUsers) {
                    if (u.socket_id && u.socket_id !== senderSocketId) {
                        this.io.to(u.socket_id).emit('message', msgStr);
                    }
                }
            } else if (category === 'personal') {
                const owner = await User.findById(ownerId, 'socket_id is_online');
                if (owner && owner.is_online && owner.socket_id && owner.socket_id !== senderSocketId) {
                    this.io.to(owner.socket_id).emit('message', msgStr);
                }
            }
        } catch (e) {
            console.error('broadcastToAuthorized error:', e);
        }
    }

    // --- Handlers ---

    async handleGetFiles(socketId, data) {
        const { userId, spaceId, type, category } = data;
        try {
            let effectiveCategory = category || (['personal', 'global', 'team'].includes(type) ? type : 'global');
            if (spaceId) {
                const space = await Space.findById(spaceId);
                if (space) effectiveCategory = space.category;
            }
            let query = {};

            if (spaceId) {
                const space = await Space.findById(spaceId);
                if (!space) return;
                const user = await User.findById(userId);
                if (!user) return;

                const hasAccess = await this.checkParentChainAccess(space, userId);
                if (!hasAccess) {
                    return this.controleur.envoie(this, {
                        files: { success: false, error: 'Accès au dossier refusé' },
                        id: socketId
                    });
                }
                query.space = spaceId;
            } else {
                query.space = { $in: [null, undefined] };
                query.category = effectiveCategory;
                if (effectiveCategory === 'personal' || effectiveCategory === 'team') {
                    query.owner = userId;
                }
            }

            const files = await File.find(query).populate('owner', 'firstname role').sort({ createdAt: -1 });
            this.controleur.envoie(this, {
                files: { success: true, files },
                id: socketId
            });
        } catch (e) {
            console.error('Get files error:', e);
        }
    }

    async handleUploadFile(socketId, data) {
        const { name, size, type, url, userId, spaceId, category } = data;
        try {
            const user = await User.findById(userId);
            if (!user) return;

            let effectiveCategory = category || 'personal';
            if (spaceId) {
                const space = await Space.findById(spaceId);
                if (space) effectiveCategory = space.category;
            }

            // Global permission check
            if (effectiveCategory === 'global' && !['admin', 'enseignant'].includes(user.role)) {
                return this.controleur.envoie(this, {
                    file_uploading_status: { success: false, error: 'Permission refusée pour le silo Commun' },
                    id: socketId
                });
            }

            if (spaceId) {
                const space = await Space.findById(spaceId);
                if (!space) return;
                const hasAccess = await this.checkParentChainAccess(space, userId);
                if (!hasAccess) {
                    return this.controleur.envoie(this, {
                        file_uploading_status: { success: false, error: 'Accès au dossier refusé' },
                        id: socketId
                    });
                }
            }

            const newFile = new File({
                name, size, type, url, owner: userId,
                space: spaceId || undefined,
                category: effectiveCategory
            });
            await newFile.save();
            const fullFile = await File.findById(newFile._id).populate('owner', 'firstname role');

            this.controleur.envoie(this, {
                file_uploading_status: { success: true, file: fullFile },
                id: socketId
            });

            // Broadcast
            let uploadMemberIds = [];
            if (fullFile.category === 'team' && newFile.space) {
                const associatedSpace = await Space.findById(newFile.space);
                if (associatedSpace) {
                    uploadMemberIds = (associatedSpace.members || []).map(m => m.toString());
                    uploadMemberIds.push(associatedSpace.owner.toString());
                }
            }
            await this.broadcastToAuthorized(socketId,
                { file_uploading_status: { success: true, file: fullFile } },
                fullFile.category,
                fullFile.owner._id.toString(),
                uploadMemberIds
            );
        } catch (e) {
            console.error('Upload file error:', e);
            this.controleur.envoie(this, {
                file_uploading_status: { success: false, error: "Erreur lors de l'upload" },
                id: socketId
            });
        }
    }

    async handleUpdateFile(socketId, data) {
        const { fileId, newName, userId } = data;
        try {
            const user = await User.findById(userId);
            const file = await File.findById(fileId);
            if (!user || !file) return;

            const isOwner = file.owner.toString() === userId;
            let isAuthorized = false;
            if (file.category === 'team') isAuthorized = isOwner;
            else if (file.category === 'personal') isAuthorized = isOwner;
            else isAuthorized = true;

            if (!isAuthorized) {
                return this.controleur.envoie(this, {
                    file_updating_status: { success: false, error: 'Permission refusée' },
                    id: socketId
                });
            }

            file.name = newName;
            await file.save();

            this.controleur.envoie(this, {
                file_updating_status: { success: true, fileId, newName },
                id: socketId
            });

            let updateMemberIds = [];
            if (file.category === 'team' && file.space) {
                const associatedSpace = await Space.findById(file.space);
                if (associatedSpace) {
                    updateMemberIds = (associatedSpace.members || []).map(m => m.toString());
                    updateMemberIds.push(associatedSpace.owner.toString());
                }
            }
            await this.broadcastToAuthorized(socketId,
                { file_updating_status: { success: true, fileId, newName } },
                file.category,
                file.owner.toString(),
                updateMemberIds
            );
        } catch (e) {
            console.error('Update file error:', e);
        }
    }

    async handleDeleteFile(socketId, data) {
        const { fileId, userId } = data;
        try {
            const user = await User.findById(userId);
            const file = await File.findById(fileId);
            if (!user || !file) return;

            const isOwner = file.owner.toString() === userId;
            let isAuthorized = false;
            if (file.category === 'team') isAuthorized = isOwner;
            else if (file.category === 'personal') isAuthorized = isOwner;
            else isAuthorized = true;

            if (!isAuthorized) {
                return this.controleur.envoie(this, {
                    file_deleting_status: { success: false, error: 'Permission refusée' },
                    id: socketId
                });
            }

            await File.findByIdAndDelete(fileId);

            this.controleur.envoie(this, {
                file_deleting_status: { success: true, fileId },
                id: socketId
            });

            let delMemberIds = [];
            if (file.category === 'team' && file.space) {
                const associatedSpace = await Space.findById(file.space);
                if (associatedSpace) {
                    delMemberIds = (associatedSpace.members || []).map(m => m.toString());
                    delMemberIds.push(associatedSpace.owner.toString());
                }
            }
            await this.broadcastToAuthorized(socketId,
                { file_deleting_status: { success: true, fileId } },
                file.category,
                file.owner.toString(),
                delMemberIds
            );
        } catch (e) {
            console.error('Delete file error:', e);
            this.controleur.envoie(this, {
                file_deleting_status: { success: false, error: 'Erreur lors de la suppression' },
                id: socketId
            });
        }
    }

    async handleCreateSpace(socketId, data) {
        const { name, userId, category, members, parentId } = data;
        try {
            const user = await User.findById(userId);
            if (!user) return;

            let effectiveCategory = category || 'personal';
            if (parentId) {
                const parent = await Space.findById(parentId);
                if (parent) effectiveCategory = parent.category;
            }

            if (effectiveCategory === 'global' && !['admin', 'enseignant'].includes(user.role)) {
                return this.controleur.envoie(this, {
                    space_creating_status: { success: false, error: 'Permission refusée' },
                    id: socketId
                });
            }

            if (parentId) {
                const parentSpace = await Space.findById(parentId);
                if (parentSpace) {
                    const hasAccess = await this.checkParentChainAccess(parentSpace, userId);
                    if (!hasAccess && effectiveCategory !== 'global') {
                        return this.controleur.envoie(this, {
                            space_creating_status: { success: false, error: 'Permission refusée (parent)' },
                            id: socketId
                        });
                    }
                }
            }

            let finalMembers = members || [];
            if (parentId && effectiveCategory === 'team') {
                const parentSpace = await Space.findById(parentId);
                if (parentSpace && parentSpace.members) {
                    finalMembers = parentSpace.members;
                }
            }

            const newSpace = new Space({
                name, owner: userId, category: effectiveCategory,
                parent: parentId || null,
                members: finalMembers,
                isPersonal: (effectiveCategory === 'personal')
            });
            await newSpace.save();

            const fullSpace = await Space.findById(newSpace._id)
                .populate('members', 'firstname role')
                .populate('owner', 'firstname role');

            this.controleur.envoie(this, {
                space_creating_status: { success: true, space: fullSpace },
                id: socketId
            });

            await this.broadcastToAuthorized(socketId,
                { space_creating_status: { success: true, space: fullSpace } },
                fullSpace.category,
                fullSpace.owner._id.toString(),
                fullSpace.members.map(m => m._id.toString())
            );
        } catch (e) {
            console.error('Create space error:', e);
            this.controleur.envoie(this, {
                space_creating_status: { success: false, error: 'Erreur lors de la création' },
                id: socketId
            });
        }
    }

    async handleGetSpaces(socketId, data) {
        const { userId, category, type, parentId } = data;
        try {
            let query = { parent: parentId ? parentId : { $in: [null, undefined] } };
            let effectiveCategory = category || (['personal', 'global', 'team'].includes(type) ? type : 'global');

            if (parentId) {
                const parent = await Space.findById(parentId);
                if (parent) effectiveCategory = parent.category;
            }

            const user = await User.findById(userId);
            if (!user) return;

            if (effectiveCategory === 'personal') {
                query.owner = userId;
                query.category = 'personal';
            } else if (effectiveCategory === 'global') {
                query.category = 'global';
            } else if (effectiveCategory === 'team') {
                query.category = 'team';
                query.$or = [{ owner: userId }, { members: userId }];
            }

            const spaces = await Space.find(query)
                .populate('members', 'firstname role')
                .populate('owner', 'firstname role')
                .sort({ name: 1 });

            this.controleur.envoie(this, {
                spaces: { success: true, spaces, parentId: parentId || null },
                id: socketId
            });
        } catch (e) {
            console.error('Get spaces error:', e);
        }
    }

    async handleDeleteSpace(socketId, data) {
        const { spaceId, userId } = data;
        try {
            const user = await User.findById(userId);
            const space = await Space.findById(spaceId);
            if (!user || !space) return;

            const isOwner = space.owner.toString() === userId;
            let isAuthorized = false;
            if (space.category === 'team') isAuthorized = isOwner;
            else if (space.category === 'personal') isAuthorized = isOwner;
            else isAuthorized = true;

            if (!isAuthorized) {
                return this.controleur.envoie(this, {
                    space_deleting_status: { success: false, error: 'Permission refusée' },
                    id: socketId
                });
            }

            await File.updateMany({ space: spaceId }, { $unset: { space: "" } });
            await Space.findByIdAndDelete(spaceId);

            this.controleur.envoie(this, {
                space_deleting_status: { success: true, spaceId },
                id: socketId
            });

            await this.broadcastToAuthorized(socketId,
                { space_deleting_status: { success: true, spaceId } },
                space.category,
                space.owner.toString(),
                (space.members || []).map(m => m.toString())
            );
        } catch (e) {
            console.error('Delete space error:', e);
            this.controleur.envoie(this, {
                space_deleting_status: { success: false, error: 'Erreur lors de la suppression' },
                id: socketId
            });
        }
    }

    async handleRenameSpace(socketId, data) {
        const { spaceId, newName, userId } = data;
        try {
            const user = await User.findById(userId);
            const space = await Space.findById(spaceId);
            if (!user || !space) return;

            const isOwner = space.owner.toString() === userId;
            let isAuthorized = false;
            if (space.category === 'team') isAuthorized = isOwner;
            else if (space.category === 'personal') isAuthorized = isOwner;
            else isAuthorized = true;

            if (!isAuthorized) {
                return this.controleur.envoie(this, {
                    space_renaming_status: { success: false, error: 'Permission refusée' },
                    id: socketId
                });
            }

            space.name = newName;
            await space.save();

            this.controleur.envoie(this, {
                space_renaming_status: { success: true, spaceId, newName },
                id: socketId
            });

            await this.broadcastToAuthorized(socketId,
                { space_renaming_status: { success: true, spaceId, newName } },
                space.category,
                space.owner.toString(),
                (space.members || []).map(m => m.toString())
            );
        } catch (e) {
            console.error('Rename space error:', e);
        }
    }

    async handleResolvePath(socketId, data) {
        const { path, category, userId } = data;
        const names = path || [];
        try {
            let currentParentId = null;
            let resolvedPath = [];
            let finalCategory = category || 'personal';

            console.log(`[ResolvePath] Attempting: ${names.join('|')} in category ${finalCategory} for user ${userId}`);

            let matchFound = true;
            for (const name of names) {
                let parentQuery = currentParentId ? currentParentId : { $in: [null, undefined] };
                let query = { name: { $regex: new RegExp('^' + name + '$', 'i') }, parent: parentQuery, category: finalCategory };

                if (finalCategory === 'personal') query.owner = userId;
                if (finalCategory === 'team') {
                    query.$or = [{ owner: userId }, { members: userId }];
                }

                let space = await Space.findOne(query).populate('owner', 'firstname role');

                // Fallback: try by name and parent only
                if (!space && currentParentId) {
                    space = await Space.findOne({ name, parent: currentParentId }).populate('owner', 'firstname role');
                }

                if (!space) {
                    matchFound = false;
                    break;
                }
                resolvedPath.push(space);
                currentParentId = space._id;
                finalCategory = space.category || finalCategory;
            }

            // Second pass: try other silos at root
            if (!matchFound && resolvedPath.length === 0) {
                const silos = ['personal', 'global', 'team'];
                for (const s of silos) {
                    if (s === category) continue;
                    currentParentId = null;
                    resolvedPath = [];
                    let subMatch = true;
                    for (const name of names) {
                        let parentQuery = currentParentId ? currentParentId : { $in: [null, undefined] };
                        let query = { name: { $regex: new RegExp('^' + name + '$', 'i') }, parent: parentQuery, category: s };
                        if (s === 'personal') query.owner = userId;
                        if (s === 'team') {
                            query.$or = [{ owner: userId }, { members: userId }];
                        }
                        const space = await Space.findOne(query).populate('owner', 'firstname role');
                        if (!space) { subMatch = false; break; }
                        resolvedPath.push(space);
                        currentParentId = space._id;
                    }
                    if (subMatch) {
                        finalCategory = s;
                        matchFound = true;
                        break;
                    }
                }
            }

            if (matchFound) {
                this.controleur.envoie(this, {
                    resolved_path: { success: true, path: resolvedPath, category: finalCategory },
                    id: socketId
                });
            } else {
                this.controleur.envoie(this, {
                    resolved_path: { success: false, error: 'Path not found' },
                    id: socketId
                });
            }
        } catch (e) {
            console.error('Resolve path error:', e);
            this.controleur.envoie(this, {
                resolved_path: { success: false, error: 'Erreur interne' },
                id: socketId
            });
        }
    }
}

module.exports = FilesService;

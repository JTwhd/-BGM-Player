import fs from 'fs';
import path from 'path';
import readline from 'readline';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const ACTIVATION_CODES_FILE = path.join(CONFIG_DIR, 'activation-codes.json');
const MUSIC_LIBRARY_FILE = path.join(CONFIG_DIR, 'music-library.json');

function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}

function generateActivationCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
        if (i > 0 && i % 4 === 0) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function loadActivationCodes() {
    if (fs.existsSync(ACTIVATION_CODES_FILE)) {
        return JSON.parse(fs.readFileSync(ACTIVATION_CODES_FILE, 'utf-8'));
    }
    return [];
}

function saveActivationCodes(codes) {
    ensureConfigDir();
    fs.writeFileSync(ACTIVATION_CODES_FILE, JSON.stringify(codes, null, 2));
}

function loadMusicLibrary() {
    if (fs.existsSync(MUSIC_LIBRARY_FILE)) {
        return JSON.parse(fs.readFileSync(MUSIC_LIBRARY_FILE, 'utf-8'));
    }
    return { tracks: [], lastUpdated: new Date().toISOString() };
}

function saveMusicLibrary(library) {
    ensureConfigDir();
    fs.writeFileSync(MUSIC_LIBRARY_FILE, JSON.stringify(library, null, 2));
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function showMenu() {
    console.log('\n===========================================');
    console.log('   Valorant BGM Player - 管理工具');
    console.log('===========================================');
    console.log('1. 生成新的激活码');
    console.log('2. 查看所有激活码');
    console.log('3. 删除激活码');
    console.log('4. 管理音乐库');
    console.log('5. 退出');
    console.log('===========================================\n');
}

async function generateCode() {
    const expiresDays = await question('输入有效期天数（留空为永久）: ');
    const days = expiresDays.trim() ? parseInt(expiresDays) : null;

    const code = generateActivationCode();
    const codes = loadActivationCodes();

    const expiresAt = days
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null;

    codes.push({
        code,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
        used: false
    });

    saveActivationCodes(codes);

    console.log('\n✅ 激活码生成成功！');
    console.log(`   激活码: ${code}`);
    console.log(`   有效期: ${days ? days + '天' : '永久'}`);
    if (expiresAt) {
        console.log(`   过期时间: ${expiresAt}`);
    }
}

async function listCodes() {
    const codes = loadActivationCodes();

    if (codes.length === 0) {
        console.log('\n暂无激活码\n');
        return;
    }

    console.log('\n所有激活码:');
    console.log('-------------------------------------------');
    codes.forEach((c, index) => {
        console.log(`${index + 1}. ${c.code}`);
        console.log(`   创建时间: ${c.created_at}`);
        console.log(`   状态: ${c.used ? '已使用' : '未使用'}`);
        if (c.expires_at) {
            console.log(`   过期时间: ${c.expires_at}`);
        }
        console.log('-------------------------------------------');
    });
}

async function deleteCode() {
    const codes = loadActivationCodes();

    if (codes.length === 0) {
        console.log('\n暂无激活码\n');
        return;
    }

    console.log('\n所有激活码:');
    codes.forEach((c, index) => {
        console.log(`${index + 1}. ${c.code} ${c.used ? '[已使用]' : '[未使用]'}`);
    });

    const choice = await question('\n选择要删除的编号: ');
    const index = parseInt(choice) - 1;

    if (index >= 0 && index < codes.length) {
        const deleted = codes.splice(index, 1)[0];
        saveActivationCodes(codes);
        console.log(`\n✅ 已删除激活码: ${deleted.code}\n`);
    } else {
        console.log('\n❌ 无效的选择\n');
    }
}

async function manageMusic() {
    while (true) {
        console.log('\n音乐库管理');
        console.log('-------------------------------------------');
        console.log('1. 添加音乐');
        console.log('2. 查看音乐列表');
        console.log('3. 删除音乐');
        console.log('4. 返回主菜单');
        console.log('-------------------------------------------');

        const choice = await question('选择操作: ');

        if (choice.trim() === '4') break;

        if (choice.trim() === '1') {
            const name = await question('音乐名称: ');
            const category = await question('分类 (victory/defeat): ');
            const filePath = await question('文件路径: ');

            const library = loadMusicLibrary();
            library.tracks.push({
                id: `music_${Date.now()}`,
                name: name.trim(),
                category: category.trim(),
                file_path: filePath.trim(),
                tags: [],
                added_at: new Date().toISOString()
            });
            library.lastUpdated = new Date().toISOString();
            saveMusicLibrary(library);
            console.log('\n✅ 音乐添加成功！\n');
        } else if (choice.trim() === '2') {
            const library = loadMusicLibrary();
            if (library.tracks.length === 0) {
                console.log('\n暂无音乐\n');
            } else {
                console.log('\n音乐列表:');
                library.tracks.forEach((t, index) => {
                    console.log(`${index + 1}. ${t.name} [${t.category}]`);
                    console.log(`   文件: ${t.file_path}`);
                });
            }
        } else if (choice.trim() === '3') {
            const library = loadMusicLibrary();
            if (library.tracks.length === 0) {
                console.log('\n暂无音乐\n');
                continue;
            }

            console.log('\n音乐列表:');
            library.tracks.forEach((t, index) => {
                console.log(`${index + 1}. ${t.name} [${t.category}]`);
            });

            const choice = await question('\n选择要删除的编号: ');
            const index = parseInt(choice) - 1;

            if (index >= 0 && index < library.tracks.length) {
                const deleted = library.tracks.splice(index, 1)[0];
                saveMusicLibrary(library);
                console.log(`\n✅ 已删除音乐: ${deleted.name}\n`);
            } else {
                console.log('\n❌ 无效的选择\n');
            }
        }
    }
}

async function main() {
    console.log('欢迎使用 Valorant BGM Player 管理工具！');

    while (true) {
        await showMenu();
        const choice = await question('请选择操作: ');

        switch (choice.trim()) {
            case '1':
                await generateCode();
                break;
            case '2':
                await listCodes();
                break;
            case '3':
                await deleteCode();
                break;
            case '4':
                await manageMusic();
                break;
            case '5':
                console.log('\n再见！\n');
                rl.close();
                process.exit(0);
            default:
                console.log('\n❌ 无效的选择\n');
        }
    }
}

main();
